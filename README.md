# Louis Tran — personal blog

A personal blog on economics, markets, and investing. Built with [Astro](https://astro.build),
designed with the **Hallmark** skill (custom theme: warm beige paper, navy accent, Libre Franklin
headings + Source Serif 4 body), and deployed to **GitHub Pages**.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
```

Other commands:

```bash
npm run build    # static build to ./dist
npm run preview  # preview the production build locally
```

## Writing a post

Add a Markdown file to `src/content/posts/`. Frontmatter schema (validated by Zod in
`src/content.config.ts`):

```yaml
---
title: Your post title
description: One-line summary shown in listings and meta tags.
pubDate: 2026-07-20            # any date string
category: Business Analysis    # one of: Business Analysis · Macro · Personal Investing
readingTime: 6 min read        # optional
draft: false                   # optional; drafts are hidden in production, shown in dev
---
```

The three categories are defined once in `src/content.config.ts` (`CATEGORIES`) and their
slugs/descriptions in `src/lib/categories.ts`. The home-page stats (essay count, sections, years
active) are derived from real content — no hardcoded numbers.

## Site configuration

Edit `src/site.config.ts` for the title, author, tagline, and contact links (email/GitHub shown
in the footer and About page).

## Deploying to GitHub Pages

This repo is set up for a **user page** at `https://louiscoder27.github.io`.

1. Create a repository named exactly **`louiscoder27.github.io`** on GitHub.
2. Push this project to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial blog"
   git branch -M main
   git remote add origin https://github.com/louiscoder27/louiscoder27.github.io.git
   git push -u origin main
   ```
3. In the repository, go to **Settings → Pages → Build and deployment → Source** and select
   **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`.

### If you use a project repo instead

If you host this at `https://louiscoder27.github.io/<repo>` rather than the user page, update
`astro.config.mjs`:

```js
site: 'https://louiscoder27.github.io',
base: '/<repo>',
```

`public/.nojekyll` is included so GitHub serves Astro's `_astro/` asset directory correctly.

## Design system

The visual system is documented in the stamp at the top of `src/styles/tokens.css` and in
`.hallmark/log.json`. All colours, fonts, spacing, and motion reference named CSS tokens — edit
`src/styles/tokens.css` to retheme the whole site from one place.
