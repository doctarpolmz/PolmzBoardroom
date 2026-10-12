-- ============================================================================
-- Polmz Boardroom — Trigger Fix
-- ============================================================================
-- Run this in the Supabase SQL Editor if you see "error saving new user"
-- when trying to sign up. It replaces the handle_new_user trigger function
-- with a more robust version that:
--   1. Uses search_path = public (avoids function resolution failures)
--   2. Sanitises the fallback username from email to match the check
--      constraint ^[a-zA-Z0-9_-]{3,20}$
--   3. Handles short usernames by padding with a random suffix
-- ============================================================================

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

-- Recreate the trigger to pick up the updated function
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- If you previously had failed signup attempts that created orphaned auth
-- users (without a profile row), you can clean them up and create the
-- missing profiles by running the following. Uncomment and execute ONLY
-- if you know you have orphaned users:
-- ============================================================================

-- insert into public.profiles (id, username, email)
-- select
--   au.id,
--   left(regexp_replace(split_part(au.email, '@', 1), '[^a-zA-Z0-9_-]', '', 'g'), 20),
--   au.email
-- from auth.users au
-- left join public.profiles p on p.id = au.id
-- where p.id is null;
