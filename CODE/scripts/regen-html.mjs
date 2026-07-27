// One-time migration: re-render every post's `body_html` from its stored
// `body_json` using the SAME clean, semantic exporter the editor now uses
// (blocksToHTMLLossy). Older posts were saved with blocksToFullHTML, whose
// editor-only <div class="bn-block…"> markup renders as plain text on the
// public reader (no BlockNote stylesheet there). This rewrites them in place.
//
// Usage (from the CODE/ folder, with .env filled in):
//   npm run regen
//
// Requires SUPABASE_SERVICE_ROLE_KEY (bypasses RLS). Idempotent: safe to re-run.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ServerBlockNoteEditor } from '@blocknote/server-util';

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
  console.error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);
const editor = ServerBlockNoteEditor.create();

const { data: posts, error } = await supabase
  .from('posts')
  .select('id, slug, body_json');
if (error) {
  console.error('Failed to read posts:', error.message);
  process.exit(1);
}

let updated = 0;
for (const post of posts ?? []) {
  if (!Array.isArray(post.body_json) || post.body_json.length === 0) {
    console.log(`- skip ${post.slug} (no body_json)`);
    continue;
  }
  let html = '';
  try {
    html = await editor.blocksToHTMLLossy(post.body_json);
  } catch (e) {
    console.error(`! ${post.slug}: export failed — ${e.message}`);
    continue;
  }
  const { error: upErr } = await supabase
    .from('posts')
    .update({ body_html: html })
    .eq('id', post.id);
  if (upErr) {
    console.error(`! ${post.slug}: update failed — ${upErr.message}`);
    continue;
  }
  updated += 1;
  console.log(`✓ ${post.slug} (${html.length} chars)`);
}

console.log(`\nDone. Regenerated ${updated}/${(posts ?? []).length} post(s).`);
