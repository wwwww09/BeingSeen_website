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
-- 数据库层面守住的底线:
--   1. 列级授权 —— 只能写 body / star_index / client_hash,
--      不能自己设置 is_hidden, 也不能指定 id 或 created_at
--   2. body 长度由表上的 CHECK 约束限制在 1..600
--
-- 数据库层面**守不住**的:
--   限流触发器按 client_hash 计数, 而这条路径上的 client_hash 是浏览器自己
--   生成、存在 localStorage 里的一串随机字符 —— 清掉或伪造即可重置计数。
--   所以在这条路径上"每小时 20 条"不构成有效防线, 只能拦住无意的重复提交。
--   服务端端点 (/api/stories) 里的长度校验、内存限流也完全不经过。
--
-- 代价: 持有 publishable key 的人可以绕过页面直接灌数据 (只能灌 1..600 字的
-- 文本, 不能改 is_hidden / id / created_at, 但确实拦不住灌水)。
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
