-- Being Seen — moderation migration
-- Run once in the Supabase SQL Editor AFTER the existing schema.sql.
--
-- Existing stories are preserved as approved. New stories start pending and
-- are only visible to the public after an admin approves them.

alter table public.stories
  add column if not exists status text;

-- All stories that already existed before moderation are already public.
update public.stories
  set status = 'approved'
  where status is null;

alter table public.stories
  alter column status set default 'pending';

alter table public.stories
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stories_status_check'
  ) then
    alter table public.stories
      add constraint stories_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

create index if not exists stories_status_created_at_idx
  on public.stories (status, created_at desc);

-- Public visitors see approved stories; a signed-in anonymous visitor also
-- sees their own pending story so the dim ember survives a reload.
drop policy if exists "Public stories are readable" on public.stories;
create policy "Public stories are readable"
  on public.stories
  for select
  to anon, authenticated
  using (status = 'approved' or owner_id = auth.uid());

-- Never trust the client to submit an already-approved row.
drop policy if exists "Anonymous users can add a story" on public.stories;
create policy "Anonymous users can add a story"
  on public.stories
  for insert
  to authenticated
  with check (owner_id = auth.uid() and status = 'pending');

-- The owner delete policy from schema.sql is unchanged.
-- The admin API uses the service role key and bypasses RLS.
