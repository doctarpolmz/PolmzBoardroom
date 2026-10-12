-- ============================================================================
-- Polmz Boardroom — Meeting Sort Order
-- ============================================================================
-- Adds a sort_order integer column to meetings so owners can reorder cards.
-- Default 0 — existing meetings all start at the same level; the app then
-- assigns values when the owner first moves a card.
-- ============================================================================

alter table public.meetings
  add column if not exists sort_order integer default 0 not null;

create index if not exists meetings_sort_order_idx
  on public.meetings (user_id, sort_order);
