// The three top-level categories the blog tracks — the single source of truth
// used by the schema check, the admin editor's dropdown, the home-page cards,
// and the post pages. Adding a category means editing this list, CATEGORY_META
// below, and the `check` constraint in supabase/schema.sql.
export const CATEGORIES = ['Vault', 'Courses', 'Projects'] as const;
export type Category = (typeof CATEGORIES)[number];

// Maps each category to a URL slug and a one-line description used on the cards.
export const CATEGORY_META: Record<
  Category,
  { slug: string; blurb: string }
> = {
  Vault: {
    slug: 'vault',
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
  // Fall back to a derived slug if a stored value isn't in the current list
  // (e.g. a legacy `Writeups` row during the rename-to-`Vault` migration window),
  // so an unknown category degrades to a harmless link instead of crashing SSR.
  return CATEGORY_META[category]?.slug ?? String(category).toLowerCase();
}

// Reverse lookup used by the category hash links.
export function categoryFromSlug(slug: string): Category | undefined {
  return (Object.keys(CATEGORY_META) as Category[]).find(
    (c) => CATEGORY_META[c].slug === slug,
  );
}
