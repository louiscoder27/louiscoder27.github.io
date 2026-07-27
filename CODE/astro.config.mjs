// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// The blog now runs server-side (SSR) on Vercel so posts can be created/edited
// live from /admin and read from Supabase — no rebuild needed to publish.
// Public pages are cached at the edge (see per-page Cache-Control headers).
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://louistrblog.vercel.app',
  base: '/',
  trailingSlash: 'ignore',
  output: 'server',
  adapter: vercel(),
  integrations: [react(), sitemap()],
  // Astro's default CSRF origin check falsely rejects form POSTs behind Vercel's
  // proxy ("Cross-site POST form submissions are forbidden"). Admin actions are
  // still guarded by the Supabase session in middleware, so disable it here.
  security: { checkOrigin: false },
});
