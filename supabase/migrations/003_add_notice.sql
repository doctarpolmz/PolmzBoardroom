-- ============================================================================
-- Polmz Boardroom — Add Notice Board Column
-- ============================================================================
-- Adds a single editable notice per workspace. The owner sets it from the
-- dashboard; visitors see it displayed at the top of the workspace page.
-- RLS on profiles already covers this: public SELECT, owner-only UPDATE.
-- ============================================================================

alter table public.profiles add column if not exists notice text;
