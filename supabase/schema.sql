-- ============================================================================
-- Being Seen — 留言板数据库
--
-- 在 Supabase Dashboard → SQL Editor 里整段执行。
-- 可以重复执行 (全部使用 if not exists / drop ... if exists)。
--
-- 架构说明
-- ----------------------------------------------------------------------------
-- 读取: 浏览器用 publishable key 直连, 只能 SELECT, 受 RLS 限制。
-- 写入: 只能走服务端的 /api/stories, 用 secret key 写入。
--       因此 stories 表对 anon / authenticated 完全不给 INSERT 权限 ——
--       客户端即使拿到 publishable key 也无法直接灌数据。
-- ============================================================================

-- ---------------------------------------------------------------- 1. 表
create table if not exists public.stories (
  id          bigint generated always as identity primary key,
  body        text not null,
  star_index  integer,
  created_at  timestamptz not null default now(),
  is_hidden   boolean not null default false,
  client_hash text,
  constraint stories_body_len check (char_length(body) between 1 and 600)
);

create index if not exists stories_created_idx
  on public.stories (created_at desc);

-- 只让未隐藏的故事出现在时间线里
create index if not exists stories_visible_idx
  on public.stories (created_at desc)
  where is_hidden = false;

create index if not exists stories_client_idx
  on public.stories (client_hash, created_at desc);

-- ---------------------------------------------------------------- 2. RLS
alter table public.stories enable row level security;

-- 收紧默认授权: 客户端只能读
revoke all on public.stories from anon, authenticated;
grant select on public.stories to anon, authenticated;
-- 注意: 不给 insert / update / delete。
-- 写入由服务端使用 secret key 完成 (secret key 具有 bypassrls 权限)。

drop policy if exists "anyone can read visible stories" on public.stories;
create policy "anyone can read visible stories"
  on public.stories
  for select
  to anon, authenticated
  using (is_hidden = false);

-- 清掉静态部署那条路径可能留下的写入策略。
--
-- schema-public-insert.sql 会创建一个名为 "public can insert stories" 的 INSERT
-- 策略 (两个文件共享这个名字)。上面的 revoke all 已经实测能连**列级**授权一起
-- 收掉, 所以即使不删这条策略, anon 也写不进去 —— 但留一条指向 INSERT 的休眠策略
-- 迟早会咬人: 哪天有人重新 grant insert, 它会立刻生效。
-- 这里是"安全基线", 重跑它就应该回到基线的样子, 所以把它一并删掉。
drop policy if exists "public can insert stories" on public.stories;

-- ---------------------------------------------------------------- 3. 限流
-- 每个客户端 (按 IP 哈希) 每小时的留言上限。
-- 因为写入走服务端, 这一层是"数据库最后一道防线"。
create or replace function public.enforce_story_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent int;
  per_hour constant int := 20;
begin
  if new.client_hash is null then
    return new;
  end if;

  select count(*) into recent
    from public.stories
   where client_hash = new.client_hash
     and created_at > now() - interval '1 hour';

  if recent >= per_hour then
    raise exception 'rate limit exceeded: max % stories per hour', per_hour
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists stories_rate_limit on public.stories;
create trigger stories_rate_limit
  before insert on public.stories
  for each row execute function public.enforce_story_rate_limit();

-- ---------------------------------------------------------------- 4. 实时
-- 让新故事实时推送到所有已打开的页面。
-- Postgres Changes 需要表在 supabase_realtime 发布中, 且订阅方必须能通过
-- SELECT 策略 (上面已有)。
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'stories'
  ) then
    alter publication supabase_realtime add table public.stories;
  end if;
exception
  when undefined_object then
    -- 发布不存在 (自建 Postgres 的情况), 跳过
    raise notice 'supabase_realtime publication not found; skipping';
end $$;

-- ---------------------------------------------------------------- 5. 清理
-- Supabase 免费版数据库 500 MB。给一个手动清理函数备用。
create or replace function public.prune_hidden_stories(keep_days int default 90)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.stories
   where is_hidden = true
     and created_at < now() - make_interval(days => keep_days);
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- ---------------------------------------------------------------- 6. 验证
-- 执行后应该看到: 表存在, RLS 已开启, 只有 1 条 SELECT 策略。
select
  c.relname                                            as table_name,
  c.relrowsecurity                                     as rls_enabled,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'stories') as policy_count,
  (select string_agg(distinct p.cmd::text, ', ') from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'stories') as policy_cmds
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'stories';
