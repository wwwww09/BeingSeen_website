'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

/**
 * 滚动进度 —— 整部"单页电影"的驱动信号。
 *
 * 设计要点
 * ----------------------------------------------------------------------------
 * 1. 进度写进一个 **ref**, 不写进 React state。
 *    3D 场景每一帧都要读它 (useFrame), 如果放进 state, 每滚一像素就重渲染
 *    整棵树 —— 那是这类页面最常见的卡顿来源。
 * 2. 需要显示进度的 UI (右侧小圆点) 自己订阅, 而且只在"幕"变化时才 setState。
 * 3. 进度按**整个文档**的滚动范围算, 所以五幕的长短可以不等。
 */

type Listener = (p: number) => void

interface FilmCtx {
  progress: React.MutableRefObject<number>
  subscribe: (fn: Listener) => () => void
}

const Ctx = createContext<FilmCtx | null>(null)

export function FilmProgress({ children }: { children: React.ReactNode }) {
  const progress = useRef(0)
  const listeners = useMemo(() => new Set<Listener>(), [])

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
      progress.current = p
      listeners.forEach((fn) => fn(p))
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [listeners])

  const value = useMemo<FilmCtx>(
    () => ({
      progress,
      subscribe: (fn) => {
        listeners.add(fn)
        return () => listeners.delete(fn)
      },
    }),
    [listeners],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** 3D 场景用: 拿一个每帧都能读的 ref, 不触发重渲染 */
export function useFilmProgressRef() {
  return useContext(Ctx)?.progress ?? { current: 0 }
}

/**
 * UI 用: 只在"幕"切换时重渲染, 不做逐像素更新。
 * 返回 { progress, act } —— act 是 0..4, 对应五幕。
 */
export function useFilmAct() {
  const ctx = useContext(Ctx)
  const [act, setAct] = useState(0)
  useEffect(() => {
    if (!ctx) return
    let last = -1
    return ctx.subscribe((p) => {
      // 与 scroll.tsx 里的 ACT_STOPS 对应
      const next = p < 0.16 ? 0 : p < 0.46 ? 1 : p < 0.72 ? 2 : p < 0.9 ? 3 : 4
      if (next !== last) {
        last = next
        setAct(next)
      }
    })
  }, [ctx])
  return act
}


/** 右侧的五幕进度点 —— 只在一幕之内不重渲染 */
export function FilmProgressDots() {
  const act = useFilmAct()
  return (
    <div className="progress" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="progress__dot" data-on={i === act} />
      ))}
    </div>
  )
}
