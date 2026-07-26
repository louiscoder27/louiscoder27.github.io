import { createSupabaseAnon } from './supabase';
import { CATEGORIES } from './categories';
import type { Category } from './categories';

// A post in the shape the rest of the site already expects. Historically posts
// came from an Astro content collection (`post.id`, `post.data.*`); we keep that
// shape so pages barely change now that the source is Supabase. `id` is the slug.
export interface Post {
  id: string; // slug (used in /blog/[slug] URLs)
  uuid: string; // DB primary key (used by the admin editor / API)
  body_html: string; // rendered article HTML for the public page
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    category: Category;
    readingTime?: string;
    published: boolean;
  };
}

// Raw row shape from the `posts` table.
interface Row {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: Category;
  body_html: string;
  reading_time: string | null;
  published: boolean;
  pub_date: string;
  updated_date: string | null;
}

export function rowToPost(row: Row): Post {
  return {
    id: row.slug,
    uuid: row.id,
    body_html: row.body_html ?? '',
    data: {
      title: row.title,
      description: row.description ?? '',
      pubDate: new Date(row.pub_date),
      updatedDate: row.updated_date ? new Date(row.updated_date) : undefined,
      category: row.category,
      readingTime: row.reading_time ?? undefined,
      published: row.published,
    },
  };
}

const COLUMNS =
  'id, slug, title, description, category, body_html, reading_time, published, pub_date, updated_date';

// All published posts, newest first. RLS on the anon client already hides
// unpublished rows, but we filter explicitly too for clarity.
export async function getPosts(): Promise<Post[]> {
  try {
    const supabase = createSupabaseAnon();
    const { data, error } = await supabase
      .from('posts')
      .select(COLUMNS)
      .eq('published', true)
      .order('pub_date', { ascending: false });
    if (error) {
      console.error('[posts] getPosts failed:', error.message);
      return [];
    }
    return (data ?? []).map((r) => rowToPost(r as Row));
  } catch (e) {
    console.error('[posts] getPosts crashed:', (e as Error).message);
    return [];
  }
}

// A single published post by slug, or null (404) if missing/unpublished.
export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const supabase = createSupabaseAnon();
    const { data, error } = await supabase
      .from('posts')
      .select(COLUMNS)
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    if (error || !data) return null;
    return rowToPost(data as Row);
  } catch (e) {
    console.error('[posts] getPostBySlug crashed:', (e as Error).message);
    return null;
  }
}

// Post count per category (honest figures for the stat strip + cards).
export function countByCategory(posts: Post[]): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    Category,
    number
  >;
  for (const p of posts) counts[p.data.category] += 1;
  return counts;
}

// Years active, derived from the earliest post — never an invented number.
export function yearsActive(posts: Post[], fallbackYear: number): number {
  const years = posts.map((p) => p.data.pubDate.getFullYear());
  const firstYear = years.length ? Math.min(...years) : fallbackYear;
  return Math.max(1, new Date().getFullYear() - firstYear + 1);
}
