// The three top-level categories the blog tracks — the single source of truth
// used by the schema check, the admin editor's dropdown, the home-page cards,
// and the post pages. Adding a category means editing this list, CATEGORY_META
// below, and the `check` constraint in supabase/schema.sql.
export const CATEGORIES = ['Writeups', 'Courses', 'Projects'] as const;
export type Category = (typeof CATEGORIES)[number];

// Maps each category to a URL slug and a one-line description used on the cards.
export const CATEGORY_META: Record<
  Category,
  { slug: string; blurb: string }
> = {
  Writeups: {
    slug: 'writeups',
    blurb:
      'Written analysis about ideas taken apart and thought through on the page.',
  },
  Courses: {
    slug: 'courses',
    blurb:
      'Structured notes and lessons in UEH',
  },
  Projects: {
    slug: 'projects',
    blurb:
      'Science research, and other things I make.',
  },
};

export function categorySlug(category: Category): string {
  return CATEGORY_META[category].slug;
}

// Reverse lookup used by the category hash links.
export function categoryFromSlug(slug: string): Category | undefined {
  return (Object.keys(CATEGORY_META) as Category[]).find(
    (c) => CATEGORY_META[c].slug === slug,
  );
}
