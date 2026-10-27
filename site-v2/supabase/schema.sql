-- Being Seen — public Message Board schema
-- Run this once in the Supabase SQL Editor.
--
-- The board is readable by everyone. Writing and deleting require an
-- anonymous Supabase user, and a visitor can only delete their own story.

create extension if not exists pgcrypto;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  star_index integer not null unique
    check (star_index >= 0 and star_index < 10000),
  x double precision not null check (x >= 0 and x <= 1),
  y double precision not null check (y >= 0 and y <= 1),
  story text not null check (char_length(story) between 1 and 600),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists stories_created_at_idx
  on public.stories (created_at desc);

create index if not exists stories_owner_created_at_idx
  on public.stories (owner_id, created_at desc);

alter table public.stories enable row level security;

drop policy if exists "Public stories are readable" on public.stories;
create policy "Public stories are readable"
  on public.stories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anonymous users can add a story" on public.stories;
create policy "Anonymous users can add a story"
  on public.stories
  for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Owners can delete their story" on public.stories;
create policy "Owners can delete their story"
  on public.stories
  for delete
  to authenticated
  using (owner_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select on table public.stories to anon, authenticated;
grant insert, delete on table public.stories to authenticated;

-- One story per minute, ten per day per anonymous user.
-- SECURITY DEFINER lets the check read all rows without weakening RLS.
create or replace function public.enforce_story_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.stories
    where owner_id = new.owner_id
      and created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Please wait a minute before sharing another story.';
  end if;

  if (
    select count(*)
    from public.stories
    where owner_id = new.owner_id
      and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'You have reached the daily limit of ten stars.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_story_rate_limit on public.stories;
create trigger enforce_story_rate_limit
  before insert on public.stories
  for each row
  execute function public.enforce_story_rate_limit();

-- Realtime: new and deleted stories appear on every open board.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
end
$$;
