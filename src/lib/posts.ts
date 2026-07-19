import { getCollection } from 'astro:content';
import { CATEGORIES } from '../content.config';
import type { Category } from '../content.config';

// All non-draft posts, newest first. Drafts are hidden in production builds
// but visible during `astro dev` so you can preview them.
export async function getPosts() {
  const posts = await getCollection('posts', ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return posts.sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
}

// Post count per category (honest figures for the stat strip + cards).
export function countByCategory(
  posts: Awaited<ReturnType<typeof getPosts>>,
): Record<Category, number> {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<
    Category,
    number
  >;
  for (const p of posts) counts[p.data.category] += 1;
  return counts;
}

// Years active, derived from the earliest post — never an invented number.
export function yearsActive(
  posts: Awaited<ReturnType<typeof getPosts>>,
  fallbackYear: number,
): number {
  const years = posts.map((p) => p.data.pubDate.getFullYear());
  const firstYear = years.length ? Math.min(...years) : fallbackYear;
  return Math.max(1, new Date().getFullYear() - firstYear + 1);
}
