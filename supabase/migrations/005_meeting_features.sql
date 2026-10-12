-- ============================================================================
-- Polmz Boardroom — Meeting Features Migration
-- ============================================================================
-- Adds: scheduled_at, ends_at, passcode, resources (JSON array of links),
--       join_count (click tracking) to the meetings table.
-- Creates: audit_log table for activity trail.
-- Run in Supabase SQL Editor.
-- ============================================================================

-- 1. Extend meetings table
alter table public.meetings
  add column if not exists scheduled_at  timestamp with time zone,
  add column if not exists ends_at       timestamp with time zone,
  add column if not exists passcode      text,
  add column if not exists resources     jsonb default '[]'::jsonb,
  add column if not exists join_count    integer default 0 not null;

-- 2. Audit log table
create table if not exists public.audit_log (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  action      text not null,
  entity      text,        -- e.g. 'meeting', 'notice', 'workspace'
  entity_id   uuid,
  detail      text,
  created_at  timestamp with time zone
              default timezone('utc'::text, now()) not null
);

create index if not exists audit_log_user_id_idx on public.audit_log (user_id);
create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

-- 3. RLS on audit_log
alter table public.audit_log enable row level security;

-- Only the owner can read their own audit log
drop policy if exists "Users can view their own audit log" on public.audit_log;
create policy "Users can view their own audit log"
  on public.audit_log for select
  using ((select auth.uid()) = user_id);

-- Only the owner can insert into their own audit log
drop policy if exists "Users can insert their own audit log" on public.audit_log;
create policy "Users can insert their own audit log"
  on public.audit_log for insert
  with check ((select auth.uid()) = user_id);

-- 4. Function to increment join_count safely (avoids RLS issues on anon update)
-- We use a security-definer RPC so unauthenticated visitors can still
-- increment the counter without needing update permission on the row.
create or replace function public.increment_join_count(meeting_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.meetings
  set join_count = join_count + 1
  where id = meeting_id;
end;
$$;
-- ============================================================================
