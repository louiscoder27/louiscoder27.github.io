// One-time migration: read the legacy Markdown posts in src/content/posts/*.md
// and upsert them into the Supabase `posts` table (as published HTML).
//
// Usage (from the CODE/ folder, with .env filled in):
//   npm run seed
//
// Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Idempotent: re-running
// updates the same rows (matched by slug).

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Minimal .env loader so we don't need an extra dependency.
function loadEnv() {
  const file = join(root, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    'Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const postsDir = join(root, 'src', 'content', 'posts');
if (!existsSync(postsDir)) {
  console.error('No src/content/posts directory found — nothing to seed.');
  process.exit(1);
}

const files = readdirSync(postsDir).filter((f) => f.endsWith('.md'));
if (!files.length) {
  console.log('No .md files to seed.');
  process.exit(0);
}

let ok = 0;
for (const file of files) {
  const raw = readFileSync(join(postsDir, file), 'utf8');
  const { data, content } = matter(raw);
  const slug = basename(file, '.md');
  const html = marked.parse(content);

  const row = {
    slug,
    title: data.title ?? slug,
    description: data.description ?? '',
    category: data.category ?? 'Vault',
    body_json: null,
    body_html: html,
    published: data.draft ? false : true,
    pub_date: data.pubDate
      ? new Date(data.pubDate).toISOString()
      : new Date().toISOString(),
    updated_date: data.updatedDate
      ? new Date(data.updatedDate).toISOString()
      : null,
  };

  const { error } = await supabase
    .from('posts')
    .upsert(row, { onConflict: 'slug' });
  if (error) {
    console.error(`  ✗ ${slug}: ${error.message}`);
  } else {
    ok += 1;
    console.log(`  ✓ ${slug}`);
  }
}

console.log(`\nSeeded ${ok}/${files.length} posts.`);
process.exit(ok === files.length ? 0 : 1);
