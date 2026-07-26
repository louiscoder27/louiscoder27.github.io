// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// The blog now runs server-side (SSR) on Vercel so posts can be created/edited
// live from /admin and read from Supabase — no rebuild needed to publish.
// Public pages are cached at the edge (see per-page Cache-Control headers).
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://louis-blog.vercel.app',
  base: '/',
  trailingSlash: 'ignore',
  output: 'server',
  adapter: vercel(),
  integrations: [react(), sitemap()],
});
