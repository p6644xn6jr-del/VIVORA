-- VIVORA Lab manual migration: admin role and safer user column grants.
-- Apply manually in the dedicated VIVORA Lab Supabase SQL Editor.
-- Do not run this against the team or production Supabase project.
--
-- Lab note:
-- VIVORA Lab currently uses SUPABASE_ANON_KEY for Backend table queries and
-- keeps application-table RLS disabled. This migration reduces accidental role
-- escalation by preventing anon/authenticated Data API clients from inserting
-- or updating public.users.role. It is still not a complete production
-- security model.

alter table public.users
  add column if not exists role text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and conname = 'users_role_check'
  ) then
    alter table public.users
      add constraint users_role_check
      check (role in ('user', 'admin'));
  end if;
end $$;

-- Shion Watanabe is the official admin user in VIVORA Lab.
-- Confirm public.users.user_id = 1 is Shion Watanabe before applying.
update public.users
set role = 'admin'
where user_id = 1;

grant select, delete on table public.users to anon, authenticated;
revoke insert, update on table public.users from anon, authenticated;
grant insert (
  id,
  display_name,
  email,
  birthday,
  age_visibility,
  area,
  icon_url,
  profile,
  bio,
  is_private,
  favorite_genres
) on table public.users to anon, authenticated;
grant update (
  display_name,
  birthday,
  age_visibility,
  area,
  icon_url,
  profile,
  bio,
  is_private,
  favorite_genres
) on table public.users to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;
alter table public.users disable row level security;
