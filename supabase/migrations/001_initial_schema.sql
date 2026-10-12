-- ============================================================================
-- Polmz Boardroom — Database Schema & Security Migration
-- ============================================================================
-- Execute this script in the Supabase SQL Editor (Dashboard → SQL Editor → New Query).
-- This script is idempotent where possible, but for a clean re-run it is
-- recommended to drop existing objects first if you are starting over.
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";  -- provides gen_random_uuid()

-- ============================================================================
-- 1. Profiles Table (Extends Supabase auth.users)
-- ============================================================================
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  username    text unique not null
              check (username ~ '^[a-zA-Z0-9_-]{3,20}$'),
  email       text not null,
  notice      text,
  created_at  timestamp with time zone
              default timezone('utc'::text, now()) not null
);

-- Index for high-performance public workspace resolution
create index if not exists profiles_username_idx on public.profiles (username);

-- ============================================================================
-- 2. Meetings Table
-- ============================================================================
create table if not exists public.meetings (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  description text,
  url         text not null,
  is_locked   boolean default false not null,
  created_at  timestamp with time zone
              default timezone('utc'::text, now()) not null
);

-- Index foreign key for RLS optimization
create index if not exists meetings_user_id_idx on public.meetings (user_id);

-- ============================================================================
-- 3. Automatic Profile Creation Trigger on Signup
-- ============================================================================
-- NOTE: The original spec used "create or function" which is invalid syntax.
--       The correct PostgreSQL syntax is "create or replace function".
--
-- IMPORTANT FIXES from original spec:
--   - search_path set to 'public' instead of '' to avoid function resolution
--     failures in certain Supabase configurations.
--   - Fallback username (from email prefix) is sanitised to match the check
--     constraint ^[a-zA-Z0-9_-]{3,20}$. Without this, an email like
--     john.doe@example.com would produce username "john.doe" (contains a dot)
--     which violates the constraint and rolls back the entire signup.
--   - Minimum-length enforcement: if the sanitised username is shorter than
--     3 characters, a random suffix is appended.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
begin
  -- Prefer username passed via sign-up metadata
  v_username := new.raw_user_meta_data ->> 'username';

  -- Fallback: derive from email prefix and strip characters that violate
  -- the check constraint ^[a-zA-Z0-9_-]{3,20}$
  if v_username is null or v_username = '' then
    v_username := regexp_replace(
      split_part(new.email, '@', 1),
      '[^a-zA-Z0-9_-]',
      '',
      'g'
    );
  end if;

  -- If still too short after sanitising, pad with a random suffix
  if char_length(v_username) < 3 then
    v_username := left(v_username || 'user' || substr(md5(random()::text), 1, 6), 20);
  end if;

  -- Enforce maximum length of 20
  v_username := left(v_username, 20);

  insert into public.profiles (id, username, email)
  values (new.id, v_username, new.email);

  return new;
end;
$$;

-- Drop and recreate the trigger to keep the script idempotent
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 4. Enable Row Level Security (RLS) on all tables
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.meetings  enable row level security;

-- ============================================================================
-- 5. RLS Policies
-- ============================================================================

-- -------------------------------------------------------
-- Profiles: Public read for workspace routing, owner-only update
-- -------------------------------------------------------
drop policy if exists "Public profiles are viewable by everyone"
  on public.profiles;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update own profile"
  on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- -------------------------------------------------------
-- Meetings: Public read so visitors can view a workspace's meeting cards
-- -------------------------------------------------------
drop policy if exists "Meetings are viewable by everyone in a workspace"
  on public.meetings;

create policy "Meetings are viewable by everyone in a workspace"
  on public.meetings for select
  using (true);

-- -------------------------------------------------------
-- Meetings: Insert, Update, Delete strictly restricted to the meeting owner
-- -------------------------------------------------------
drop policy if exists "Users can insert their own meetings"
  on public.meetings;

create policy "Users can insert their own meetings"
  on public.meetings for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own meetings"
  on public.meetings;

create policy "Users can update their own meetings"
  on public.meetings for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own meetings"
  on public.meetings;

create policy "Users can delete their own meetings"
  on public.meetings for delete
  using ((select auth.uid()) = user_id);

-- ============================================================================
-- End of migration
-- ============================================================================
