# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal blog on economics, markets, and investing (English), built with **Astro** (static
output), designed with the vendored **Hallmark** skill, and deployed to **GitHub Pages** as a user
page at `https://louiscoder27.github.io`.

## Commands

```bash
npm install
npm run dev      # dev server at http://localhost:4321
npm run build    # static build to ./dist
npm run preview  # serve the production build locally
```

There is no test suite. Verification is done by building and driving the dev server (the
`playwright` devDependency + the allowlisted Playwright/curl commands in
`.claude/settings.local.json` exist for this). When verifying visually, note the dark floating pill
over the page is the **Astro dev toolbar** — it only appears in `dev`, never in the build.

## Architecture

- **Content collections** — posts are Markdown in `src/content/posts/*.md`, defined by the Astro 5
  content-layer glob loader in `src/content.config.ts` with a **zod** schema
  (`title, description, pubDate, category, readingTime?, draft?`). `category` is a `z.enum` of the
  three standing sections. Drafts are hidden in `build` but shown in `dev`.
- **Single sources of truth:**
  - `src/content.config.ts` exports `CATEGORIES` (the three category names) — the schema, cards,
    and category routes all read from it. Adding a category means editing this enum **and**
    `src/lib/categories.ts` (slug + blurb).
  - `src/site.config.ts` — title, author, tagline, contact links. Edit here, not in components.
- **Data helpers** — `src/lib/posts.ts`: `getPosts()` (draft-filtered, newest first),
  `countByCategory()`, `yearsActive()`. The home-page stats (essay count, sections, years active)
  are **derived from real content** — never hardcode these numbers (Hallmark honest-copy rule).
- **Routing** — `src/pages/`: `index.astro` (home), `blog/index.astro` (archive),
  `blog/[...slug].astro` (post, `getStaticPaths` from the collection, `render()` for the body),
  `about.astro`, `category/[category].astro` (`getStaticPaths` over `CATEGORIES`). Post slug is the
  Markdown file's `id` (filename without extension).
- **Layouts/components** — `BaseLayout` (head, fonts, masthead + footer) and `PostLayout` wrap
  pages; components are `Header` (N6 masthead nav), `Footer` (Ft2), `Hero`, `StatStrip` (count-up
  reveal), `PostCard`, `CategoryCards`.
- **Base-path discipline** — this repo may move between a user page (`base: '/'`) and a project
  repo. Every internal link is built through a `withBase()` helper using `import.meta.env.BASE_URL`,
  so links keep working if `base` changes in `astro.config.mjs`. Follow that pattern for new links.

## Design system (Hallmark)

The visual system is a **custom Hallmark theme** — stamp at the top of `src/styles/tokens.css`, log
in `.hallmark/log.json`. Macrostructure **Stat-Led**, nav **N6 masthead**, footer **Ft2**; warm
beige paper + navy accent; **Libre Franklin** (display/headings) + **Source Serif 4** (body). All
colour/font/spacing/motion values are **locked CSS tokens** in `src/styles/tokens.css` — reference
them by name (`var(--color-accent)`), never inline raw values; retheme the whole site from that one
file. `src/styles/global.css` holds base + `.prose` (article) styles.

## Deploy

`.github/workflows/deploy.yml` builds with `withastro/action` and publishes with
`actions/deploy-pages` on push to `main`. Repo must be named `louiscoder27.github.io` and have Pages
→ Source set to **GitHub Actions**. `public/.nojekyll` keeps GitHub from stripping `_astro/`. See
`README.md` for the full setup steps.
