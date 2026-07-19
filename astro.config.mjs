// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages — user page repo (louiscoder27.github.io) serves from the domain root,
// so `base` stays '/'. If you ever move this to a project repo (e.g. github.com/<user>/blog),
// set `base: '/blog'` and the site URL accordingly.
export default defineConfig({
  site: 'https://louiscoder27.github.io',
  base: '/',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
