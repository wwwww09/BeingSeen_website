import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSecretKey } from '@/lib/supabase'

/**
 * 留言写入端点。
 *
 * 为什么不由浏览器直连 Supabase 写入?
 *   - 客户端 key 是公开的, 任何人都能绕过前端直接灌数据
 *   - 服务端可以在这里做长度校验、字段白名单和 IP 级限流
 *   - stories 表因此对 anon 角色完全不开放 INSERT 权限
 *
 * 写入使用 secret key (具有 bypassrls), 所以数据库层的 RLS 不拦它;
 * 但 enforce_story_rate_limit 触发器仍然会生效, 作为最后一道防线。
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LEN = 600
const MIN_LEN = 2
const MAX_STAR_INDEX = 4096

// 极简的内存限流 (单实例有效)。真正的防线是数据库触发器。
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 3
const hits = new Map<string, number[]>()

function memoryRateLimit(key: string): boolean {
  const now = Date.now()
  const arr = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(key, arr)
    return false
  }
  arr.push(now)
  hits.set(key, arr)
  // 顺手清理, 避免 map 无界增长
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t > WINDOW_MS)) hits.delete(k)
    }
  }
  return true
}

function clientHash(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  const ua = req.headers.get('user-agent') ?? ''
  // 只存哈希, 不存原始 IP
  return createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)
}

export async function POST(req: Request) {
  const url = getSupabaseUrl()
  const secret = getSecretKey()

  if (!url || !secret) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message:
          'The guestbook is not connected to a database yet. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.',
      },
      { status: 503 },
    )
  }

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const obj = payload as { body?: unknown; starIndex?: unknown }
  const rawBody = typeof obj?.body === 'string' ? obj.body.trim() : ''

  if (rawBody.length < MIN_LEN) {
    return NextResponse.json(
      { error: 'too_short', message: 'Please write at least a few characters.' },
      { status: 400 },
    )
  }
  if (rawBody.length > MAX_LEN) {
    return NextResponse.json(
      {
        error: 'too_long',
        message: `Please keep it under ${MAX_LEN} characters (you wrote ${rawBody.length}).`,
      },
      { status: 400 },
    )
  }

  const hash = clientHash(req)
  if (!memoryRateLimit(hash)) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many stories in a row. Please wait a moment.' },
      { status: 429 },
    )
  }

  // 星体索引: 只接受合法范围内的整数, 其余交给数据库随机/置空
  let starIndex: number | null = null
  if (typeof obj?.starIndex === 'number' && Number.isFinite(obj.starIndex)) {
    const i = Math.trunc(obj.starIndex)
    if (i >= 0 && i < MAX_STAR_INDEX) starIndex = i
  }

  const supabase = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase
    .from('stories')
    .insert({ body: rawBody, star_index: starIndex, client_hash: hash })
    .select('id, body, star_index, created_at')
    .single()

  if (error) {
    // 触发器抛出的限流错误
    if (error.code === 'P0001' || error.message?.includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: 'This device has reached the hourly limit. Please come back later.',
        },
        { status: 429 },
      )
    }
    console.error('[stories] insert failed:', error)
    return NextResponse.json(
      { error: 'insert_failed', message: 'Could not save your story. Please try again.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ story: data }, { status: 201 })
}

export async function GET() {
  return NextResponse.json(
    { error: 'method_not_allowed', message: 'Read stories directly from Supabase.' },
    { status: 405 },
  )
}
