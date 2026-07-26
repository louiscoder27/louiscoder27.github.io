# Louis Tran — personal blog

A personal blog on economics, markets, and investing. Built with [Astro](https://astro.build) (SSR
on Vercel), designed with the **Hallmark** skill (warm beige paper, navy accent, Libre Franklin
headings + Source Serif 4 body). Posts are written **on the web** in a protected `/admin` dashboard
with a Notion-style [BlockNote](https://www.blocknotejs.org) editor and stored in
[Supabase](https://supabase.com) (Postgres). Deployed to **Vercel**.

> This folder (`CODE/`) is the Astro project itself. It sits one level inside the git repository —
> run `npm` commands from here, but run `git` commands from the parent folder (the repo root).

## Local development

```bash
npm install
cp .env.example .env    # fill in your Supabase values (see below)
npm run dev             # http://localhost:4321
```

Other commands:

```bash
npm run build     # SSR build via the Vercel adapter (.vercel/output)
npm run preview   # preview the production build locally
npm run seed      # one-time: import legacy src/content/posts/*.md into Supabase
```

## Environment variables

Copy `.env.example` to `.env` and fill in. Add the same keys in Vercel → Project Settings →
Environment Variables.

| Variable | Where to get it | Used by |
| --- | --- | --- |
| `PUBLIC_SUPABASE_URL` | Supabase → Settings → API | client + server |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **only** the seed script (never the browser) |
| `PUBLIC_SITE_URL` | your deployed URL | sitemap / links |
| `ADMIN_EMAIL` | your email | only this address may sign in to `/admin` |

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (Singapore region is close).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. This creates the
   `posts` table, row-level security, an `updated_at` trigger, and the public `post-assets` bucket.
3. **Authentication → Providers → Email**: keep it enabled, and under **Sign In / Providers** (or
   Auth settings) **turn off "Allow new users to sign up"** so only you can log in.
4. **Authentication → Users → Add user**: add your `ADMIN_EMAIL` (auto-confirm).
5. **Authentication → URL Configuration**: set **Site URL** and add Redirect URLs for both
   `http://localhost:4321/**` and your Vercel domain `https://<project>.vercel.app/**` so magic-link
   sign-in works in dev and prod.
6. Copy **Project URL**, **anon key**, and **service_role key** into `.env`.

## 2. Import the old Markdown posts (optional, one time)

The five legacy essays still live in `src/content/posts/*.md`. With `.env` filled in:

```bash
npm run seed
```

This converts each Markdown file to HTML and upserts it into the `posts` table (published). You can
then edit them in `/admin`. After a successful import you may delete `src/content/posts/`.

## 3. Writing / editing posts on the web

1. Go to `/login`, enter your admin email, and click the magic link in your inbox.
2. The dashboard at `/admin` lists every post. Use **+ New post**, or **Edit** an existing one.
3. Write in the BlockNote editor (type `/` for the block menu; drag-drop or paste images — they
   upload to Supabase storage). Fill in title, slug, category, description, reading time.
4. Tick **Published** (or **Save & publish**) to make it public. It appears on the home page and at
   `/blog/<slug>` immediately (public pages are edge-cached for ~60s).

## Site configuration

Edit `src/site.config.ts` for the title, author, tagline, and contact links. Categories live in
`src/lib/categories.ts` (`CATEGORIES` + slug/blurb) — to add one, also update the `category` check
constraint in `supabase/schema.sql`.

## 4. Deploy to Vercel

1. Push the repo to GitHub (run `git` from the **repo root**, the parent of this `CODE/` folder).
2. In Vercel, **Add New → Project → import the repo**.
3. Set **Root Directory = `CODE`**. Framework preset **Astro** is auto-detected.
4. Add all environment variables from the table above.
5. **Deploy.** Every push to `main` redeploys. Confirm the Vercel domain is in Supabase Auth →
   URL Configuration (step 1.5) so sign-in works in production.

## Design system

The visual system is documented in the stamp at the top of `src/styles/tokens.css` and in
`.hallmark/log.json`. All colours, fonts, spacing, and motion reference named CSS tokens — edit
`src/styles/tokens.css` to retheme the whole site from one place. `src/styles/global.css` holds base
+ `.prose` (article) styles applied to the rendered post HTML.
