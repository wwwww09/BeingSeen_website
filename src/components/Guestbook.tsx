'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clientOnly, useWebGLSupport } from '@/components/three/clientOnly'
import { STAR_COUNT, STORY_FETCH_LIMIT } from '@/lib/stars'

const StoryStarfield = clientOnly(
  () => import('@/components/three/StoryStarfield'),
  520,
)

export interface StoryRow {
  id: number
  body: string
  star_index: number | null
  created_at: string
  /** 只有实时推送的载荷里会带上; 读取查询已用 RLS/过滤排除隐藏项 */
  is_hidden?: boolean
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** 把故事分配到星体上: 已指定且未占用的用指定值, 其余按 id 稳定分配 */
function assignStars(stories: StoryRow[]): Map<number, StoryRow> {
  const used = new Set<number>()
  const map = new Map<number, StoryRow>()

  const placed = new Set<number>()
  for (const s of stories) {
    if (
      typeof s.star_index === 'number' &&
      s.star_index >= 0 &&
      s.star_index < STAR_COUNT &&
      !used.has(s.star_index)
    ) {
      used.add(s.star_index)
      map.set(s.star_index, s)
      placed.add(s.id)
    }
  }
  for (const s of stories) {
    if (placed.has(s.id)) continue
    let idx = s.id % STAR_COUNT
    let guard = 0
    while (used.has(idx) && guard < STAR_COUNT) {
      idx = (idx + 1) % STAR_COUNT
      guard++
    }
    if (guard < STAR_COUNT) {
      used.add(idx)
      map.set(idx, s)
    }
  }
  return map
}

/** 读取环境变量 (NEXT_PUBLIC_ 在构建时被内联, 客户端可用) */
function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || !url.startsWith('http')) return null
  return { url, key }
}

/** 基于浏览器的稳定客户端标识, 仅供限流使用 (不含任何身份信息) */
function localClientHash(): string {
  const KEY = 'beingseen.client'
  try {
    let v = localStorage.getItem(KEY)
    if (!v) {
      v = Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem(KEY, v)
    }
    return `web-${v}`.slice(0, 32)
  } catch {
    return 'web-anonymous'
  }
}

export default function Guestbook({ configured }: { configured: boolean }) {
  const [stories, setStories] = useState<StoryRow[]>([])
  const [loading, setLoading] = useState(configured)
  const [selected, setSelected] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingStar, setPendingStar] = useState<number | null>(null)
  const clientRef = useRef<SupabaseClient | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 没有 WebGL 时不该提示"点一颗星星" —— 那颗星星根本画不出来
  const webgl = useWebGLSupport()

  const starMap = useMemo(() => assignStars(stories), [stories])
  const litIndices = useMemo(() => [...starMap.keys()], [starMap])
  const starOfStory = useMemo(() => {
    const m = new Map<number, number>()
    for (const [idx, story] of starMap) m.set(story.id, idx)
    return m
  }, [starMap])

  // ------------------------------------------------------------ 客户端初始化
  useEffect(() => {
    if (!configured) {
      setLoading(false)
      return
    }
    const cfg = supabaseConfig()
    if (!cfg) {
      setLoading(false)
      return
    }
    const client = createClient(cfg.url, cfg.key, {
      auth: { persistSession: false },
    })
    clientRef.current = client

    let cancelled = false

    // 初始读取 + 实时订阅
    const load = async () => {
      const { data, error } = await client
        .from('stories')
        .select('id, body, star_index, created_at')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(STORY_FETCH_LIMIT)
      if (cancelled) return
      if (error) {
        console.error('[guestbook] load failed:', error.message)
      } else {
        /*
         * 按 id 合并, 而不是直接覆盖。
         *
         * 这次读取返回之前, 界面上可能已经有故事了 —— 用户自己刚提交的, 或者
         * 实时推送里另一位访客刚写的。直接 setStories(data) 会把它们抹掉, 用户
         * 会看到自己刚点亮的故事凭空消失, 直到手动刷新才回来。
         * 读取只负责补齐, 不负责删除。
         */
        setStories((prev) => {
          const byId = new Map<number, StoryRow>()
          for (const s of [...(data ?? []), ...prev] as StoryRow[]) byId.set(s.id, s)
          return [...byId.values()]
            .sort((a, b) =>
              a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
            )
            .slice(0, STORY_FETCH_LIMIT)
        })
      }
      setLoading(false)
    }
    void load()

    const channel = client
      .channel('stories-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stories' },
        (payload) => {
          const row = payload.new as StoryRow
          if (row.is_hidden) return
          setStories((prev) =>
            prev.some((p) => p.id === row.id) ? prev : [row, ...prev],
          )
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void client.removeChannel(channel)
      clientRef.current = null
    }
  }, [configured])

  // ------------------------------------------------------------ 选择星体
  const handleSelectStar = useCallback(
    (i: number) => {
      setSelected(i)
      setPendingStar(i)
      setStatus('idle')
      setMessage(null)
      const existing = starMap.get(i)
      if (existing) {
        document
          .getElementById(`story-${existing.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        setTimeout(() => textareaRef.current?.focus(), 60)
      }
    },
    [starMap],
  )

  // ------------------------------------------------------------ 提交
  const submit = useCallback(async () => {
    const text = body.trim()
    if (text.length < 2) {
      setStatus('error')
      setMessage('Please write at least a couple of characters.')
      return
    }
    setStatus('sending')
    setMessage(null)

    const payload = { body: text, starIndex: pendingStar }

    // 先试服务端端点 (存在时它负责校验与限流)
    let serverUnavailable = false
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // 静态导出下没有这个路由, 会返回 404 的 HTML
      const ct = res.headers.get('content-type') ?? ''
      if (res.status === 404 || !ct.includes('application/json')) {
        serverUnavailable = true
      } else {
        const json = (await res.json()) as {
          story?: StoryRow
          message?: string
          error?: string
        }
        if (!res.ok || !json.story) {
          setStatus('error')
          setMessage(json.message ?? 'Something went wrong. Please try again.')
          return
        }
        setStories((prev) => [json.story as StoryRow, ...prev])
        finish(json.story as StoryRow)
        return
      }
    } catch {
      serverUnavailable = true
    }

    // 回退: 客户端直连 Supabase (仅静态部署需要)
    if (serverUnavailable) {
      const client = clientRef.current
      if (!client) {
        setStatus('error')
        setMessage(
          'The guestbook is not connected to a database, so your story could not be saved.',
        )
        return
      }
      const { data, error } = await client
        .from('stories')
        .insert({
          body: text,
          star_index: pendingStar,
          client_hash: localClientHash(),
        })
        .select('id, body, star_index, created_at')
        .single()

      if (error) {
        setStatus('error')
        setMessage(
          error.message.includes('rate limit')
            ? 'This device has reached the hourly limit. Please come back later.'
            : 'Could not save your story. Please try again.',
        )
        return
      }
      setStories((prev) => [data as StoryRow, ...prev])
      finish(data as StoryRow)
      return
    }

    setStatus('error')
    setMessage('Something went wrong. Please try again.')
  }, [body, pendingStar])

  const finish = useCallback((story: StoryRow) => {
    setBody('')
    setStatus('sent')
    setMessage('Your story is now part of this star.')
    setSelected(story.star_index ?? null)
    setTimeout(() => {
      document
        .getElementById(`story-${story.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
  }, [])

  const remaining = 600 - body.length

  return (
    <div className="guestbook">
      {/* ------------------------------------------------- 星图 */}
      <div className="guestbook__scene">
        <div className="guestbook__canvas">
          <StoryStarfield
            litIndices={litIndices}
            selected={selected}
            onSelect={handleSelectStar}
            fallbackNote="You can still leave your story in the box on the right — it will light a star for you."
          />
        </div>
        <div className="guestbook__hint">
          {loading
            ? 'reading the sky…'
            : webgl === false
              ? `${litIndices.length} of ${STAR_COUNT} stars have been lit by a story · write yours in the box →`
              : `${litIndices.length} of ${STAR_COUNT} stars have been lit by a story · click a dim star to leave yours`}
        </div>
      </div>

      {/* ------------------------------------------------- 侧栏 */}
      <aside className="guestbook__side">
        <div className="guestbook__form">
          {/* h2 而不是 h3: 本页只有 h1 "Being Seen", 直接跳到 h3 会让
              屏幕阅读器按标题浏览时出现断层 */}
          <h2 className="sub-title" style={{ marginBottom: 8 }}>
            {pendingStar === null
              ? 'Leave an anonymous story'
              : starMap.has(pendingStar)
                ? `Star #${pendingStar} already holds a story`
                : `You chose star #${pendingStar}`}
          </h2>

          {!configured && (
            <div className="callout callout--gold" style={{ marginBottom: 14 }}>
              <p className="callout__quote" style={{ fontSize: 14 }}>
                The guestbook is not connected yet
              </p>
              <p className="callout__note">
                Stories cannot be saved until a Supabase project is connected. Set{' '}
                <span className="mono">NEXT_PUBLIC_SUPABASE_URL</span> and{' '}
                <span className="mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>, then run
                the SQL in <span className="mono">supabase/schema.sql</span>.
              </p>
            </div>
          )}

          <textarea
            ref={textareaRef}
            className="textarea"
            rows={5}
            maxLength={600}
            placeholder="A moment when you felt unseen…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={status === 'sending' || !configured}
            aria-label="Your anonymous story"
          />

          <div className="guestbook__formfoot">
            <span
              className="small"
              style={{ color: remaining < 60 ? 'var(--gold)' : 'var(--text-faint)' }}
            >
              {remaining} characters left
            </span>
            <button
              className="btn btn--primary btn--sm"
              onClick={submit}
              disabled={status === 'sending' || !configured || body.trim().length < 2}
            >
              {status === 'sending' ? 'Lighting…' : 'Light this star'}
            </button>
          </div>

          {message && (
            <p
              className="small"
              style={{
                marginTop: 10,
                color: status === 'error' ? 'var(--red)' : 'var(--lens-green)',
              }}
              role="status"
            >
              {message}
            </p>
          )}

          <p className="small muted" style={{ marginTop: 12 }}>
            Your story is stored without any account, name, or identity. Only the text and
            the star it belongs to are saved.
          </p>
        </div>

        <div className="guestbook__stories">
          <div className="guestbook__stories-head">
            <span className="section__label" style={{ margin: 0 }}>
              Stories
            </span>
            <span className="badge">{stories.length}</span>
          </div>

          {stories.length === 0 ? (
            <p className="small muted" style={{ padding: '4px 2px' }}>
              {loading
                ? 'Loading stories…'
                : 'No stories yet. The stars are all still dark — yours would be the first.'}
            </p>
          ) : (
            <ul className="storylist">
              {stories.map((s) => {
                const idx = starOfStory.get(s.id)
                return (
                  <li
                    key={s.id}
                    id={`story-${s.id}`}
                    className={`storylist__item${
                      selected !== null && idx === selected
                        ? ' storylist__item--active'
                        : ''
                    }`}
                  >
                    <div className="storylist__meta">
                      <span className="storylist__star">
                        ★ {idx === undefined ? '—' : `star #${idx}`}
                      </span>
                      <time dateTime={s.created_at}>
                        {new Date(s.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    </div>
                    <p className="storylist__body">{s.body}</p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
