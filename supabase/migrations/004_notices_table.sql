-- ============================================================================
-- Polmz Boardroom — Notices Table
-- ============================================================================
-- Replaces the single notice column on profiles with a dedicated table so
-- each workspace can have multiple notices. Run this in the Supabase SQL Editor.
-- ============================================================================

-- 1. Create the notices table
create table if not exists public.notices (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  content     text not null,
  created_at  timestamp with time zone
              default timezone('utc'::text, now()) not null
);

-- Index for fast per-workspace lookups
create index if not exists notices_user_id_idx on public.notices (user_id);

-- 2. Enable RLS
alter table public.notices enable row level security;

-- 3. RLS Policies
-- Public read so visitors can see a workspace's notices
drop policy if exists "Notices are viewable by everyone"
  on public.notices;
create policy "Notices are viewable by everyone"
  on public.notices for select
  using (true);

-- Owner-only insert
drop policy if exists "Users can insert their own notices"
  on public.notices;
create policy "Users can insert their own notices"
  on public.notices for insert
  with check ((select auth.uid()) = user_id);

-- Owner-only update
drop policy if exists "Users can update their own notices"
  on public.notices;
create policy "Users can update their own notices"
  on public.notices for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Owner-only delete
drop policy if exists "Users can delete their own notices"
  on public.notices;
create policy "Users can delete their own notices"
  on public.notices for delete
  using ((select auth.uid()) = user_id);

-- 4. Optionally drop the old single-notice column from profiles
-- (safe to run, ignores error if column doesn't exist)
alter table public.profiles drop column if exists notice;
