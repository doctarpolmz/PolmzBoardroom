-- ============================================================================
-- Polmz Boardroom — Allow Username Updates
-- ============================================================================
-- The profiles RLS already allows owners to UPDATE their own row.
-- This migration adds nothing new to the DB — the existing
-- "Users can update own profile" policy covers username changes.
-- Run this only as a reminder / documentation step.
-- ============================================================================

-- Verify the update policy exists (no-op if already present)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Optional: log that settings page is now active
-- (No schema changes required)
