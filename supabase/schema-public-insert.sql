-- ============================================================================
-- 可选: 打开"客户端直连写入"权限
--
-- 何时需要?
--   仅在使用静态导出部署时 (没有服务端, 因此没有 /api/stories)。
--   正常部署 (含 Route Handler) 不需要执行本文件。
--
-- 安全性说明
-- ----------------------------------------------------------------------------
-- 这个策略让持有 publishable key 的浏览器可以 INSERT 到 stories 表。
-- 数据库层面仍然守住三条底线:
--   1. 列级授权 —— 只能写 body / star_index / client_hash,
--      不能自己设置 is_hidden, 也不能指定 id 或 created_at
--   2. body 长度由表上的 CHECK 约束限制在 1..600
--   3. 限流触发器仍然生效 (每 client_hash 每小时 20 条)
--
-- 代价: 恶意用户可以绕过前端直接灌数据 (有限流兜底)。
-- 如果这不可接受, 请改用带 Route Handler 的正常部署。
-- ============================================================================

-- 只给这三列的 INSERT 权限, 其余列一律不可写
grant insert (body, star_index, client_hash) on public.stories to anon, authenticated;

drop policy if exists "public can insert stories" on public.stories;
create policy "public can insert stories"
  on public.stories
  for insert
  to anon, authenticated
  with check (
    char_length(body) between 1 and 600
    and (star_index is null or (star_index >= 0 and star_index < 4096))
    and is_hidden = false
  );

-- 验证: 应该看到 2 条策略 (select + insert)
select
  p.polname            as policy_name,
  p.cmd                as command,
  array_to_string(p.polroles::regrole[], ', ') as roles
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'stories'
order by p.cmd;
