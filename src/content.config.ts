import { glob } from 'astro/loaders';
import { defineCollection, z } from 'astro:content';

// The three top-level categories the blog tracks. Kept here so pages, the schema,
// and the category cards all read from one source of truth.
export const CATEGORIES = ['Business Analysis', 'Macro', 'Personal Investing'] as const;
export type Category = (typeof CATEGORIES)[number];

// Markdown lives in src/content/posts/*.md (the brief's "content/posts").
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(CATEGORIES),
    readingTime: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };
