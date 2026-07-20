// Central site configuration — edit these values to make the blog yours.
export const SITE = {
  title: 'Louis Trinh',
  // Small line that sits above the masthead wordmark (kept short, editorial).
  edition: 'Notes on Economics, Markets & Investing',
  // Sub-line under the wordmark in the masthead.
  kicker: 'Economics · Markets · Investing',
  author: 'Louis Trinh',
  description:
    'A personal journal on business analysis, macroeconomics, and building a durable personal portfolio — written in plain English, one essay at a time.',
  // Used for the honest "time active" stat when there are no posts yet. The stat
  // prefers the earliest post date when posts exist, so update posts, not this.
  sinceYear: 2024,
  email: 'louistr2706@gmail.com',
  github: 'https://github.com/louiscoder27',
  // Add or remove contact links freely — the footer renders whatever is here.
  links: [
    { label: 'Email', href: 'mailto:louistr2706@gmail.com' },
    { label: 'GitHub', href: 'https://github.com/louiscoder27' },
  ],
} as const;
