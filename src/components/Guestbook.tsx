'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { clientOnly } from '@/components/three/clientOnly'

const StoryStarfield = clientOnly(
  () => import('@/components/three/StoryStarfield'),
  520,
)

export const STAR_COUNT = 320

export interface StoryRow {
  id: number
  body: string
  star_index: number | null
  created_at: string
}

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** 把故事分配到星体上: 已指定且未占用的用指定值, 其余按哈希稳定分配 */
function assignStars(stories: StoryRow[]): Map<number, StoryRow> {
  const used = new Set<number>()
  const map = new Map<number, StoryRow>()

  // 先安排显式指定了 star_index 的
  for (const s of stories) {
    if (
      typeof s.star_index === 'number' &&
      s.star_index >= 0 &&
      s.star_index < STAR_COUNT &&
      !used.has(s.star_index)
    ) {
      used.add(s.star_index)
      map.set(s.star_index, s)
    }
  }
  // 其余用 id 哈希分配, 线性探测找空位
  for (const s of stories) {
    if ([...map.values()].some((v) => v.id === s.id)) continue
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

export default function Guestbook({
  initialStories,
  configured,
  realtimeEnabled,
}: {
  initialStories: StoryRow[]
  configured: boolean
  realtimeEnabled: boolean
}) {
  const [stories, setStories] = useState<StoryRow[]>(initialStories)
  const [selected, setSelected] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [pendingStar, setPendingStar] = useState<number | null>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const starMap = useMemo(() => assignStars(stories), [stories])
  const litIndices = useMemo(() => [...starMap.keys()], [starMap])

  // ------------------------------------------------------------ Realtime
  useEffect(() => {
    if (!realtimeEnabled) return
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const client = createClient(url, key, {
      auth: { persistSession: false },
    })
    supabaseRef.current = client

    const channel = client
      .channel('stories-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stories' },
        (payload) => {
          const row = payload.new as StoryRow
          setStories((prev) =>
            prev.some((p) => p.id === row.id) ? prev : [row, ...prev],
          )
        },
      )
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [realtimeEnabled])

  // 反向索引: story.id → 星体编号
  const starOfStory = useMemo(() => {
    const m = new Map<number, number>()
    for (const [idx, story] of starMap) m.set(story.id, idx)
    return m
  }, [starMap])

  // ------------------------------------------------------------ 交互
  const handleSelectStar = useCallback(
    (i: number) => {
      setSelected(i)
      setPendingStar(i)
      setStatus('idle')
      setMessage(null)
      // 已有故事的星: 滚动到该故事
      const existing = starMap.get(i)
      if (existing) {
        document
          .getElementById(`story-${existing.id}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else {
        // 未点亮的星: 聚焦输入框
        setTimeout(() => textareaRef.current?.focus(), 60)
      }
    },
    [starMap],
  )

  const submit = useCallback(async () => {
    const text = body.trim()
    if (text.length < 2) {
      setStatus('error')
      setMessage('Please write at least a couple of characters.')
      return
    }
    setStatus('sending')
    setMessage(null)

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, starIndex: pendingStar }),
      })
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
      setBody('')
      setStatus('sent')
      setMessage('Your story is now part of this star.')
      // 让新星闪一下
      setSelected(pendingStar)
      document
        .getElementById(`story-${json.story.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }, [body, pendingStar])

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
          />
        </div>
        <div className="guestbook__hint">
          {litIndices.length} of {STAR_COUNT} stars have been lit by a story ·
          click a dim star to leave yours
        </div>
      </div>

      {/* ------------------------------------------------- 侧栏 */}
      <aside className="guestbook__side">
        <div className="guestbook__form">
          <h3 className="sub-title" style={{ marginBottom: 8 }}>
            {pendingStar === null
              ? 'Leave an anonymous story'
              : starMap.has(pendingStar)
                ? `Star #${pendingStar} already holds a story`
                : `You chose star #${pendingStar}`}
          </h3>

          {!configured && (
            <div className="callout callout--gold" style={{ marginBottom: 14 }}>
              <p className="callout__quote" style={{ fontSize: 14 }}>
                The guestbook is not connected yet
              </p>
              <p className="callout__note">
                Stories cannot be saved until a Supabase project is connected. Set{' '}
                <span className="mono">NEXT_PUBLIC_SUPABASE_URL</span> and{' '}
                <span className="mono">SUPABASE_SECRET_KEY</span>, then run the SQL in{' '}
                <span className="mono">supabase/schema.sql</span>.
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
            Your story is stored without any account, name, or identity. Only the text
            and the star it belongs to are saved.
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
              No stories yet. The stars are all still dark — yours would be the first.
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
