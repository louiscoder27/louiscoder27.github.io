-- =====================================================================
-- One-time migration: rename the "Writeups" category to "Vault".
-- Run once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- The `category` column has a CHECK constraint, so the value list and the
-- stored rows must change together. Order matters: drop the old check, move
-- the rows, then re-add the check with the new list.
-- =====================================================================

begin;

-- 1. Drop the existing category check (Postgres auto-named it posts_category_check
--    from the inline `check (...)` in schema.sql).
alter table public.posts drop constraint if exists posts_category_check;

-- 2. Rename every existing Writeups post to Vault.
update public.posts set category = 'Vault' where category = 'Writeups';

-- 3. Move the column default to the new name.
alter table public.posts alter column category set default 'Vault';

-- 4. Re-add the check with the new allowed set.
alter table public.posts
  add constraint posts_category_check
  check (category in ('Vault', 'Courses', 'Projects'));

commit;

-- Verify:
--   select category, count(*) from public.posts group by category;
