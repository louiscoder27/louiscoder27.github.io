-- =====================================================================
-- Blog schema for Supabase (Postgres). Run once in the SQL Editor.
-- Creates the `posts` table, row-level security, an updated_at trigger,
-- and a public storage bucket for post images.
-- =====================================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  description   text not null default '',
  category      text not null default 'Writeups'
                  check (category in ('Writeups', 'Courses', 'Projects')),
  body_json     jsonb,                       -- BlockNote document (source for editing)
  body_html     text not null default '',    -- rendered HTML (shown on public pages)
  published     boolean not null default false,
  pub_date      timestamptz not null default now(),
  updated_date  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists posts_published_pubdate_idx
  on public.posts (published, pub_date desc);

-- Keep updated_at fresh on every UPDATE.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
--   * Anyone (anon) can read ONLY published posts.
--   * Any authenticated user (your admin account) can do everything.
-- ---------------------------------------------------------------------
alter table public.posts enable row level security;

drop policy if exists "public reads published" on public.posts;
create policy "public reads published"
  on public.posts for select
  using (published = true);

drop policy if exists "auth reads all" on public.posts;
create policy "auth reads all"
  on public.posts for select
  to authenticated
  using (true);

drop policy if exists "auth inserts" on public.posts;
create policy "auth inserts"
  on public.posts for insert
  to authenticated
  with check (true);

drop policy if exists "auth updates" on public.posts;
create policy "auth updates"
  on public.posts for update
  to authenticated
  using (true) with check (true);

drop policy if exists "auth deletes" on public.posts;
create policy "auth deletes"
  on public.posts for delete
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- Storage bucket for images pasted/uploaded inside the editor.
-- Public read; only authenticated users can upload.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('post-assets', 'post-assets', true)
on conflict (id) do nothing;

drop policy if exists "public read post-assets" on storage.objects;
create policy "public read post-assets"
  on storage.objects for select
  using (bucket_id = 'post-assets');

drop policy if exists "auth upload post-assets" on storage.objects;
create policy "auth upload post-assets"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-assets');
