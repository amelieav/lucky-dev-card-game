-- Lucky Agent: Reset all player accounts and gameplay data.
-- WARNING: This permanently deletes all sign-ins (auth.users) and player stats.
-- Run in Supabase SQL Editor as a privileged role (e.g. postgres/service role).

begin;

-- Remove gameplay rows first for a clean wipe.
truncate table
  public.player_terms,
  public.player_debug_state,
  public.player_profile,
  public.player_state
restart identity;

-- Remove all Auth users (sign-ins). Public tables also use ON DELETE CASCADE.
delete from auth.users;

commit;

-- Optional verification:
-- select count(*) as auth_users_remaining from auth.users;
-- select count(*) as player_profiles_remaining from public.player_profile;
