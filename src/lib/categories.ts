import type { Category } from '../content.config';

// Maps each category to a URL slug and a one-line description used on the cards.
export const CATEGORY_META: Record<
  Category,
  { slug: string; blurb: string }
> = {
  'Business Analysis': {
    slug: 'business-analysis',
    blurb:
      'Reading a company from its filings out — unit economics, moats, capital allocation, and what the numbers are not saying.',
  },
  Macro: {
    slug: 'macro',
    blurb:
      'Rates, inflation, growth, and liquidity — the weather system every portfolio sails through, in plain language.',
  },
  'Personal Investing': {
    slug: 'personal-investing',
    blurb:
      'Building a durable portfolio as an individual — position sizing, temperament, fees, and the long compounding game.',
  },
};

export function categorySlug(category: Category): string {
  return CATEGORY_META[category].slug;
}

// Reverse lookup used by the category route's getStaticPaths.
export function categoryFromSlug(slug: string): Category | undefined {
  return (Object.keys(CATEGORY_META) as Category[]).find(
    (c) => CATEGORY_META[c].slug === slug,
  );
}
