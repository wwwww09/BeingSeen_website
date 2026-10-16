#!/usr/bin/env node
/**
 * 把 supabase/*.sql 真正跑一遍, 验证它声称的行为。
 *
 * 为什么需要它
 * ----------------------------------------------------------------------------
 * 这两个 SQL 文件是留言板唯一的数据库层防线 —— RLS、列级授权、限流触发器。
 * 但它们平时只被"读"过, 没被执行过。写这个脚本的第一次运行就发现
 * schema-public-insert.sql **根本跑不起来**: 它最后那句校验查询用了
 * pg_policy.cmd, 而系统表里那一列叫 polcmd。因为整段 SQL 是作为一个查询提交的,
 * Postgres 会走隐式事务 —— 最后一句报错会把前面的 grant 和 create policy
 * 一起回滚, 结果就是"看起来执行了、其实什么都没生效"。
 *
 * 用 PGlite (编译成 WASM 的真 Postgres) 跑, 所以不需要 Supabase 项目,
 * 也不需要本地装 Postgres。
 *
 * 一次性准备
 * ----------------------------------------------------------------------------
 *   pnpm add -D @electric-sql/pglite
 *
 * 没有把它写进 devDependencies, 是为了不让每次 Vercel 部署都多下载十几 MB —
 * 只有改动 SQL 时才需要跑这个。
 *
 * 用法
 *   node scripts/db-check.mjs
 *
 * 与 Supabase 的差别, 脚本里手动补上了:
 *   - Supabase 预建了 anon / authenticated 角色, 普通 Postgres 没有 -> 先 CREATE ROLE
 *   - Supabase 有 supabase_realtime publication, 这里没有 -> schema.sql 里那个
 *     DO 块本来就带 undefined_object 兜底, 顺带验证了兜底确实有效
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

let PGlite
try {
  ;({ PGlite } = await import('@electric-sql/pglite'))
} catch {
  console.log('[db-check] 没有安装 @electric-sql/pglite, 跳过。')
  console.log('[db-check] 需要时运行: pnpm add -D @electric-sql/pglite')
  process.exit(0)
}

const schema = readFileSync(join(REPO, 'supabase/schema.sql'), 'utf8')
const publicInsert = readFileSync(join(REPO, 'supabase/schema-public-insert.sql'), 'utf8')

let pass = 0
let fail = 0
const ok = (name, detail) => { pass++; console.log(`✓ ${name}${detail ? '  — ' + detail : ''}`) }
const no = (name, detail) => { fail++; console.log(`✗ ${name}${detail ? '  — ' + detail : ''}`) }
const check = (name, cond, detail) => (cond ? ok(name, detail) : no(name, detail))

/** 期待这条语句报错; 返回错误摘要, 没报错则返回 null */
async function expectError(db, sql, params) {
  try {
    await (params ? db.query(sql, params) : db.query(sql))
    return null
  } catch (e) {
    return `${e.code ?? ''} ${e.message ?? e}`.trim()
  }
}

const db = new PGlite()
await db.exec(`create role anon; create role authenticated;`)

console.log('── schema.sql ──')
try {
  await db.exec(schema)
  ok('整段执行成功 (无语法/引用错误)')
} catch (e) {
  no('执行失败', `${e.code ?? ''} ${e.message}`)
  await db.close()
  process.exit(1)
}

const v = (await db.query(`
  select c.relrowsecurity as rls,
         (select count(*) from pg_policies p
           where p.schemaname='public' and p.tablename='stories') as n,
         (select string_agg(distinct p.cmd::text, ', ') from pg_policies p
           where p.schemaname='public' and p.tablename='stories') as cmds
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname='public' and c.relname='stories'`)).rows[0]
check('文档承诺的验证行: rls_enabled = true', v.rls === true, `实际 ${v.rls}`)
check('文档承诺的验证行: policy_count = 1', Number(v.n) === 1, `实际 ${v.n}`)
check('文档承诺的验证行: policy_cmds = SELECT', v.cmds === 'SELECT', `实际 ${v.cmds}`)

await db.query(`set role anon`)
const denied = await expectError(db, `insert into public.stories (body) values ('hack')`)
check('anon 直接 INSERT 被拒 (只有 SELECT 权限)', denied !== null, denied ?? '竟然成功了')
await db.query(`reset role`)

await db.query(`insert into public.stories (body, star_index) values ('visible story', 3)`)
await db.query(`insert into public.stories (body, is_hidden) values ('hidden story', true)`)
await db.query(`set role anon`)
const anonRows = (await db.query(`select body from public.stories`)).rows.map((r) => r.body)
await db.query(`reset role`)
check('anon 只读得到未隐藏的故事', anonRows.length === 1 && anonRows[0] === 'visible story',
  JSON.stringify(anonRows))

console.log('\n── 限流触发器 (每 client_hash 每小时 20 条) ──')
await db.query(`delete from public.stories`)
let firstError = null
for (let i = 1; i <= 21; i++) {
  const err = await expectError(db,
    `insert into public.stories (body, client_hash) values ($1, $2)`, [`story ${i}`, 'same-client'])
  if (err && firstError === null) firstError = { i, err }
}
check('第 1–20 条放行', firstError === null || firstError.i === 21,
  firstError ? `第 ${firstError.i} 条就被拦` : '')
check('第 21 条被拦下', firstError?.i === 21, firstError?.err ?? '一条都没拦')
check('用的是 P0001 (API 端点按这个码返回 429)', (firstError?.err ?? '').includes('P0001'),
  firstError?.err ?? '')
check('换一个 client_hash 不受影响',
  (await expectError(db, `insert into public.stories (body, client_hash) values ('x','another-client')`)) === null)
check('没有 client_hash 时不参与限流',
  (await expectError(db, `insert into public.stories (body) values ('no hash')`)) === null)
check('body 超过 600 字被 CHECK 约束拒绝',
  (await expectError(db, `insert into public.stories (body) values ($1)`, ['a'.repeat(601)])) !== null)

console.log('\n── schema-public-insert.sql (仅静态部署需要) ──')
await db.query(`delete from public.stories`)
try {
  await db.exec(publicInsert)
  ok('整段执行成功')
} catch (e) {
  no('执行失败 (注意: 整段是一个隐式事务, 报错会全部回滚)', `${e.code ?? ''} ${e.message}`)
}
const policies = (await db.query(
  `select cmd::text as cmd from pg_policies where schemaname='public' and tablename='stories' order by cmd`)).rows
check('策略变成 2 条 (SELECT + INSERT)', policies.length === 2, policies.map((p) => p.cmd).join(', '))

await db.query(`set role anon`)
check('anon 现在可以按 body/star_index/client_hash 写入',
  (await expectError(db, `insert into public.stories (body, star_index, client_hash) values ('from the browser', 7, 'web-abc')`)) === null)
const written = (await db.query(`select body, star_index from public.stories`)).rows
check('写入的内容读得回来', written.length === 1 && written[0].star_index === 7, JSON.stringify(written))
check('anon 不能自己设置 is_hidden (列级授权)',
  (await expectError(db, `insert into public.stories (body, is_hidden) values ('x', true)`)) !== null)
check('anon 不能指定 created_at (列级授权)',
  (await expectError(db, `insert into public.stories (body, created_at) values ('x', now())`)) !== null)
check('star_index 超出 0..4095 被 WITH CHECK 拒绝',
  (await expectError(db, `insert into public.stories (body, star_index) values ('x', 99999)`)) !== null)
check('anon 写 601 字被拒绝',
  (await expectError(db, `insert into public.stories (body) values ($1)`, ['a'.repeat(601)])) !== null)
await db.query(`reset role`)

console.log('\n── 清理函数 ──')
await db.query(`delete from public.stories`)
await db.query(`insert into public.stories (body, is_hidden, created_at)
                values ('old hidden', true, now() - interval '100 days')`)
await db.query(`insert into public.stories (body) values ('a visible story')`)
const pruned = (await db.query(`select public.prune_hidden_stories(90) as n`)).rows[0]
check('prune_hidden_stories(90) 删掉 90 天前的隐藏故事', Number(pruned.n) === 1, `删除 ${pruned.n} 条`)
const kept = (await db.query(`select body from public.stories`)).rows.map((r) => r.body)
check('未隐藏的故事不受清理影响', kept.length === 1 && kept[0] === 'a visible story', JSON.stringify(kept))

console.log(`\n通过 ${pass} 项, 失败 ${fail} 项`)
await db.close()
process.exit(fail === 0 ? 0 : 1)
