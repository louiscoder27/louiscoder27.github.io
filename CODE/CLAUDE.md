# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal blog on economics, markets, and investing (English), built with **Astro** (server /
SSR output on the **Vercel** adapter), designed with the vendored **Hallmark** skill. Posts are
authored **on the web** through a protected `/admin` dashboard + BlockNote editor and stored in a
**Supabase** (Postgres) database — there are no Markdown files any more. Deployed to **Vercel**.

**Repo layout note:** the git repository root is one level up from this file (`BLOG/`). The Astro
project — everything this file describes — lives in the `BLOG/CODE/` subfolder. `BLOG/` also holds
unrelated loose assets (`Picture/`, `mã màu.txt`) and two helper scripts (`publish.bat`,
`xem-web.bat`) that `cd` into the right place before running `git`/`npm`. Deployment is now handled
by **Vercel** (Root Directory = `CODE`), so there is no GitHub Actions workflow.

## Commands

```bash
npm install
cp .env.example .env   # then fill in Supabase URL/keys (see below)
npm run dev      # dev server at http://localhost:4321
npm run build    # SSR build via the Vercel adapter (.vercel/output)
npm run preview  # serve the production build locally
npm run seed     # one-time: migrate legacy src/content/posts/*.md into Supabase
```

**Environment variables** (`.env` locally, Project Settings → Environment Variables on Vercel):
`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `PUBLIC_SITE_URL`, `ADMIN_EMAIL`, and (only for the
seed script) `SUPABASE_SERVICE_ROLE_KEY`. See `.env.example`.

There is no test suite. Verification is done by building and driving the dev server (the
`playwright` devDependency + the allowlisted Playwright/curl commands in
`.claude/settings.local.json` exist for this). When verifying visually, note the dark floating pill
over the page is the **Astro dev toolbar** — it only appears in `dev`, never in the build.

## Architecture

- **Data source (Supabase)** — posts live in the Postgres `posts` table (schema in
  `supabase/schema.sql`): `slug, title, description, category, body_json` (BlockNote document, source
  for re-editing), `body_html` (rendered article shown on public pages), `published,
  pub_date, updated_date`. **RLS** lets the anon role read only `published = true`; the authenticated
  admin can do everything. Images go to the public `post-assets` storage bucket.
- **Supabase clients** — `src/lib/supabase.ts`: `createSupabaseAnon()` (stateless, public reads) and
  `createSupabaseServer({headers,cookies})` (session-bound via cookies, used by middleware / admin
  pages / API routes). Env: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`.
- **Single sources of truth:**
  - `src/lib/categories.ts` exports `CATEGORIES` — `Vault | Courses | Projects` — plus slug/blurb
    meta. Adding or renaming a category means editing this list, the `check` constraint in
    `supabase/schema.sql`, **and** migrating the stored `category` values in the live DB (the
    `check` blocks any value not in the list, so both must move together).
  - `src/site.config.ts` — title, author, tagline, contact links. Edit here, not in components.
- **Data helpers** — `src/lib/posts.ts`: `getPosts()` (published, newest first, fails soft to `[]`),
  `getPostBySlug()`, `countByCategory()`, `yearsActive()`. They return the historical
  content-collection shape (`post.id` = slug, `post.data.*`) so pages barely changed. The home-page
  stats are **derived from real content** — never hardcode these numbers (Hallmark honest-copy rule).
- **Admin & auth** — `src/middleware.ts` guards `/admin/**`, `/api/posts`, `/api/upload`: it checks
  the Supabase session and that `user.email === ADMIN_EMAIL`, else redirects to `/login` (401 for
  APIs) and stashes `locals.user` / `locals.supabase`. Magic-link flow: `/login` → POST
  `/api/auth/login` (`signInWithOtp`) → email link → `/api/auth/callback` (`exchangeCodeForSession`) →
  `/admin`. Dashboard `src/pages/admin/index.astro` lists/toggles/deletes; editor
  `src/pages/admin/edit/[id].astro` mounts the React BlockNote island
  `src/components/admin/Editor.tsx` (`client:only="react"`, `id="new"` to create). Saving posts JSON
  **and** editor-rendered HTML to `/api/posts` (POST/PUT/PATCH/DELETE); image uploads via
  `/api/upload`.
- **Routing** — `src/pages/`: `index.astro` (home — renders `IntroStage`) and
  `blog/[...slug].astro` (post — SSR: `getPostBySlug()`, 404 if missing/unpublished, body rendered
  with `set:html` of `body_html`; before render it runs `highlightCodeBlocks()` then `buildToc()`
  from `src/lib/toc.ts`, which injects a stable anchor id on every heading and returns the table of
  contents passed to `PostLayout`). Public pages send a short `s-maxage`/`stale-while-revalidate`
  Cache-Control so edits appear fast without hammering the DB. There are **no** separate archive or
  category pages: each category (`Vault | Courses |
  Projects`) is a **tab inside the home page's "work box"** (IntroStage's third slide). The nav rail
  + bottom nav are hash links (`#vault` …); a small script in `IntroStage` swaps which
  `.work__view` is shown in the box (Home = "Latest posts"), so switching sections never loads a new
  page and never leaves the home screen. A deep-link like `/#vault` (used by the post-page
  "back"/category links) opens on load and auto-scrolls the sticky stage to reveal the box. Reading
  an individual essay still opens its own `/blog/[slug]` page. There is no separate About page either
  — the about content lives inside `IntroStage`, anchored at `#about`. A post's slug is the `slug`
  column in the DB.
- **Layouts/components** — `BaseLayout` (fonts, tokens, global styles, footer) and `PostLayout`
  (post header/prose/back-link) wrap pages. Components: `IntroStage` (the home-page hero — a single
  pinned/sticky stage where scrolling crossfades three layers in place over a fixed background
  photo: handwritten name → About card with bio/stats → the "work box" — a single box whose nav rail
  swaps between tabbed `.work__view`s in place: "Latest posts" plus one view per category, each
  listing that section's posts; clicking a post leaves for `/blog/[slug]`),
  `Footer` (Ft2), `PostCard` (category/archive list rows, used on post pages),
  `CategoryCards` (typographic section cards, currently unused by any page but kept for reuse),
  `ThemeToggle` (the fixed top-right dark/light switch — used by **both** `PostLayout` and every
  `/admin` page + `/login`, so reader and editor flip together),
  `TableOfContents` (a fixed bottom-left "TOC" pill on post pages: opens a panel listing the article's
  headings — data comes from `buildToc()` — that smooth-scrolls to a section, scroll-spies the current
  one, and per entry copies a deep link `…/blog/slug#heading-id` so a section can be referenced from
  another post). The admin editor island lives at `src/components/admin/Editor.tsx` (+ `editor.css`).
- **Base-path discipline** — this repo may move between a user page (`base: '/'`) and a project
  repo. Every internal link is built through a `withBase()` helper using `import.meta.env.BASE_URL`,
  so links keep working if `base` changes in `astro.config.mjs`. Follow that pattern for new links.

## Design system (Hallmark)

The visual system is a **custom Hallmark theme** — stamp at the top of `src/styles/tokens.css`, log
in `.hallmark/log.json`. Macrostructure **Stat-Led**, nav **N6 masthead**, footer **Ft2**. The look is
**retro/pixel**: fonts are **Press Start 2P** (`--font-display`, headings/UI), **Pixelon**
(`--font-body`, body + article + editor content) and **Crude** (`--font-script`, the hero wordmark) —
vendored in `public/fonts` and `@font-face`'d in `BaseLayout` (ignore the leftover Libre
Franklin/Source Serif deps in `package.json`). Palette is the 5 swatches in `mã màu.txt` (snow paper,
fern accent, midnight-violet ink). All colour/font/spacing/motion values are **locked CSS tokens** in
`src/styles/tokens.css` — reference them by name (`var(--color-accent)`), never inline raw values;
retheme the whole site from that one file. `src/styles/global.css` holds base + `.prose` (article)
styles.

**Light/dark theming.** Dark mode is opt-in per visitor via `ThemeToggle` (localStorage key
`post-theme`, **dark is the default** on any page that renders it). It sets `data-theme="dark"` on
`<html>`; `tokens.css` re-maps the same swatches for dark under `:root[data-theme='dark']` (ground →
Ink Void `#23212C`, ink → snow, accent → warm gold). Reader **post pages and all admin pages** carry
`body.post-page` (from `BaseLayout`'s `themeToggle` prop), which applies the article palette in
`global.css`: light = Coconut `#EBE9DD` bg / Mocha `#524378` text / Olive `#A7A955` headings; dark =
Ink Void `#23212C` bg / Vanilla Cream `#EEEBDA` text / headings keep default ink. The BlockNote
editor mirrors these — `editor.css` maps `--bn-colors-*` onto the tokens and `Editor.tsx` syncs
BlockNote's `theme` to the page via a `themechange` event. The home page has no toggle (always light).
The footer band + home-hero scrim also use **Ink Void `#23212C`** (hardcoded in `Footer.astro`, and
`--hero-scrim` / `IntroStage`), so the dark band matches the dark-mode ground everywhere.

## Deploy

Deployed to **Vercel** (the old GitHub Pages workflow is removed — SSR can't run on Pages). Import
the repo in Vercel with **Root Directory = `CODE`** (the Astro app is in this subfolder), framework
preset **Astro** (auto-detected via `@astrojs/vercel`), and add the environment variables listed
above. Every push to `main` deploys. Supabase Auth → URL Configuration must include the Vercel domain
so magic-link redirects resolve. Full step-by-step (Supabase project, `schema.sql`, seeding) is in
`README.md`.
