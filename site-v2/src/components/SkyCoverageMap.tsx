import { useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Sky coverage of the Lenscat footprint.
 *
 * A Lambert azimuthal equal-area projection of the full celestial sphere,
 * centred on the north celestial pole. Everything is drawn on Canvas: 10,000
 * mock SNe, 13,941 lenses, and the 6,843 matches. The reveal runs in three
 * passes (unmatched -> lenses -> matched) the first time the figure is seen.
 */

interface SkyMeta {
  total: number
  matched: number
  unmatched: number
  coverage: number
  matchRadius: number
  lensCount: number
  seed: number
}

interface SkyPayload {
  meta: SkyMeta
  ra: number[]
  dec: number[]
  matched: number[]
  lens: number[]
  sep: number[]
}

interface LensRow {
  ra: number
  dec: number
  redshift?: number
}

interface LensPayload {
  lenses: LensRow[]
}

interface ProjectedPoint {
  x: number
  y: number
  ra: number
  dec: number
  phase: number
  appear: number
  lens: number
  sep: number
}

interface MatchedPoint extends ProjectedPoint {
  matched: true
}

interface SkyProjection {
  w: number
  h: number
  cx: number
  cy: number
  R: number
  project: (ra: number, dec: number) => { x: number; y: number }
  invert: (x: number, y: number) => { ra: number; dec: number } | null
  rAtDec: (dec: number) => number
}

interface ProjectedData {
  projection: SkyProjection
  unmatched: ProjectedPoint[]
  lenses: ProjectedPoint[]
  matched: MatchedPoint[]
  lensScreen: { x: number; y: number }[]
}

interface HoverInfo {
  x: number
  y: number
  cursorX: number
  cursorY: number
  ra: number
  dec: number
  matched: boolean
  lens: number
  sep: number
}

const DEG = Math.PI / 180

function hash(index: number) {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value))
  return t * t * (3 - 2 * t)
}

function withAlpha(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function makeGlowSprite(inner: string, outer: string, size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  gradient.addColorStop(0, inner)
  gradient.addColorStop(0.18, outer)
  gradient.addColorStop(0.52, withAlpha(outer, 0.28))
  gradient.addColorStop(1, withAlpha(outer, 0))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return canvas
}

function makeProjection(w: number, h: number): SkyProjection {
  const R = Math.min(w, h) * 0.43
  const cx = w / 2
  const cy = h / 2

  const rAtDec = (dec: number) =>
    R * Math.sqrt(Math.max(0, (1 - Math.sin(dec * DEG)) / 2))

  const project = (ra: number, dec: number) => {
    const radius = rAtDec(dec)
    const angle = Math.PI / 2 - ra * DEG
    return {
      x: cx + Math.cos(angle) * radius,
      y: cy - Math.sin(angle) * radius,
    }
  }

  const invert = (x: number, y: number) => {
    const dx = x - cx
    const dy = cy - y
    const radius = Math.hypot(dx, dy)
    if (radius > R + 0.5) return null
    const normalized = Math.min(1, radius / R)
    const sinDec = 1 - 2 * normalized * normalized
    const dec = Math.asin(Math.min(1, Math.max(-1, sinDec))) / DEG
    const angle = Math.atan2(dy, dx)
    const ra = (((Math.PI / 2 - angle) / DEG) % 360 + 360) % 360
    return { ra, dec }
  }

  return { w, h, cx, cy, R, project, invert, rAtDec }
}

function drawGrid(ctx: CanvasRenderingContext2D, projection: SkyProjection) {
  const { w, h, cx, cy, R, rAtDec } = projection
  ctx.save()
  ctx.clearRect(0, 0, w, h)

  ctx.strokeStyle = '#1f1f1f'
  ctx.lineWidth = 1
  ctx.globalAlpha = 0.8

  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.stroke()

  for (const dec of [60, 30, 0, -30, -60]) {
    const radius = rAtDec(dec)
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.stroke()
  }

  for (const ra of [0, 90, 180, 270]) {
    const angle = Math.PI / 2 - ra * DEG
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * R, cy - Math.sin(angle) * R)
    ctx.stroke()
  }

  ctx.globalAlpha = 1
  ctx.fillStyle = '#626262'
  ctx.font = '9px "Avenir Next", system-ui, sans-serif'
  ctx.textBaseline = 'middle'

  ctx.textAlign = 'center'
  ctx.fillText('0h', cx, cy - R - 12)
  ctx.fillText('12h', cx, cy + R + 14)
  ctx.textAlign = 'left'
  ctx.fillText('6h', cx + R + 12, cy + 1)
  ctx.textAlign = 'right'
  ctx.fillText('18h', cx - R - 12, cy + 1)

  ctx.textAlign = 'right'
  ctx.font = '8px "Avenir Next", system-ui, sans-serif'
  ctx.fillStyle = '#4f4f4f'
  for (const dec of [60, 0, -60]) {
    const radius = rAtDec(dec)
    ctx.fillText(
      `${dec > 0 ? '+' : ''}${dec}°`,
      cx - radius - 6,
      cy + 1,
    )
  }

  ctx.restore()
}

export function SkyCoverageMap() {
  const figureRef = useRef<HTMLElement | null>(null)
  const wrapRef = useRef<HTMLDivElement | null>(null)
  const baseRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const projectedRef = useRef<ProjectedData | null>(null)
  const rafRef = useRef<number | null>(null)

  const inView = useInView(figureRef, { once: true, amount: 0.2 })
  const reduced = useReducedMotion() ?? false

  const [payload, setPayload] = useState<SkyPayload | null>(null)
  const [lenses, setLenses] = useState<LensRow[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const drawHoverRef = useRef<(info: HoverInfo | null) => void>(() => {})

  const sprites = useMemo(
    () => ({
      lens: makeGlowSprite('#d0d5ff', '#4A4E69', 7),
      matched: makeGlowSprite('#c9b07a', '#b89b5e', 6),
    }),
    [],
  )

  useEffect(() => {
    let cancelled = false
    const base = import.meta.env.BASE_URL

    Promise.all([
      fetch(`${base}lens_data.json`).then((response) => {
        if (!response.ok) throw new Error('Lenscat catalogue failed')
        return response.json() as Promise<LensPayload>
      }),
      fetch(`${base}sky_coverage.json`).then((response) => {
        if (!response.ok) throw new Error('Sky coverage catalogue failed')
        return response.json() as Promise<SkyPayload>
      }),
    ])
      .then(([lensData, skyData]) => {
        if (cancelled) return
        setLenses(lensData.lenses)
        setPayload(skyData)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      const next = {
        w: Math.max(1, Math.round(rect.width)),
        h: Math.max(1, Math.round(rect.height)),
      }
      setSize((previous) =>
        previous.w === next.w && previous.h === next.h ? previous : next,
      )
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const baseCanvas = baseRef.current
    const overlayCanvas = overlayRef.current
    if (!payload || !lenses || size.w < 20 || !baseCanvas || !overlayCanvas) {
      return
    }

    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3)
    for (const canvas of [baseCanvas, overlayCanvas]) {
      canvas.width = Math.round(size.w * dpr)
      canvas.height = Math.round(size.h * dpr)
      const context = canvas.getContext('2d')
      if (context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
      }
    }

    const baseContext = baseCanvas.getContext('2d')
    const overlayContext = overlayCanvas.getContext('2d')
    if (!baseContext || !overlayContext) return

    const projection = makeProjection(size.w, size.h)
    const lensScreen = lenses.map((lens) =>
      projection.project(lens.ra, lens.dec),
    )

    const unmatched: ProjectedPoint[] = []
    const matched: MatchedPoint[] = []

    payload.ra.forEach((ra, index) => {
      const dec = payload.dec[index]
      const point = projection.project(ra, dec)
      const phase = hash(index + 0.31) * Math.PI * 2
      if (payload.matched[index] === 1) {
        matched.push({
          ...point,
          ra,
          dec,
          phase,
          appear: 1.35 + hash(index + 7.13) * 1.25,
          lens: payload.lens[index],
          sep: payload.sep[index],
          matched: true,
        })
      } else {
        unmatched.push({
          ...point,
          ra,
          dec,
          phase,
          appear: hash(index + 3.7) * 0.7,
          lens: payload.lens[index],
          sep: payload.sep[index],
        })
      }
    })

    const projectedLenses: ProjectedPoint[] = lenses.map((lens, index) => {
      const point = projection.project(lens.ra, lens.dec)
      return {
        ...point,
        ra: lens.ra,
        dec: lens.dec,
        phase: hash(index + 11.7) * Math.PI * 2,
        appear: 0.55 + hash(index + 5.1) * 0.8,
        lens: index,
        sep: 0,
      }
    })

    projectedRef.current = {
      projection,
      unmatched,
      lenses: projectedLenses,
      matched,
      lensScreen,
    }

    // Keep the mobile map from turning into a solid gold band: the same
    // catalogue at 350 px needs smaller sprites than it does at 720 px.
    const spriteScale = Math.min(1, size.w / 720)
    const lensSize = Math.max(2.4, 5 * spriteScale)
    const matchedSize = Math.max(1.8, 3.4 * spriteScale)

    const drawBase = (time: number) => {
      drawGrid(baseContext, projection)

      // 1. Ghostly unmatched SNe flicker into existence.
      baseContext.globalCompositeOperation = 'source-over'
      baseContext.fillStyle = '#222222'
      for (const point of unmatched) {
        const progress = smoothstep((time - point.appear) / 0.32)
        if (progress <= 0) continue
        const flicker =
          time < 1.55 ? 0.55 + 0.45 * Math.sin(time * 7 + point.phase) : 1
        baseContext.globalAlpha = 0.2 * progress * flicker
        baseContext.fillRect(point.x, point.y, 1, 1)
      }

      // 2. Lenscat lenses emerge as a soft blue field.
      baseContext.globalCompositeOperation = 'lighter'
      const lensFade = smoothstep((time - 0.55) / 0.85)
      baseContext.globalAlpha = 0.5 * lensFade
      for (const lens of projectedLenses) {
        if (time < lens.appear) continue
        baseContext.drawImage(
          sprites.lens,
          lens.x - lensSize / 2,
          lens.y - lensSize / 2,
          lensSize,
          lensSize,
        )
        baseContext.fillStyle = '#aab0dc'
        baseContext.fillRect(lens.x - 0.5, lens.y - 0.5, 1, 1)
      }

      // 3. A faint gold web connects a subset of matches to their lenses.
      if (time > 1.9) {
        const lineAlpha = smoothstep((time - 1.9) / 0.7) * 0.04
        baseContext.globalAlpha = lineAlpha
        baseContext.strokeStyle = '#B89B5E'
        baseContext.lineWidth = 0.5
        baseContext.beginPath()
        for (let index = 0; index < matched.length; index += 12) {
          const point = matched[index]
          const lens = lensScreen[point.lens]
          if (!lens) continue
          baseContext.moveTo(point.x, point.y)
          baseContext.lineTo(lens.x, lens.y)
        }
        baseContext.stroke()
      }

      // 4. Matched SNe arrive as a gold, twinkling network. Source-over keeps
      // the dark gold from summing with the blue lens field into white.
      baseContext.globalCompositeOperation = 'source-over'
      for (const point of matched) {
        const progress = smoothstep((time - point.appear) / 0.3)
        if (progress <= 0) continue
        const twinkle =
          time < 3.15 ? 0.62 + 0.38 * Math.sin(time * 5.2 + point.phase) : 1
        baseContext.globalAlpha = progress * twinkle * 0.55
        baseContext.drawImage(
          sprites.matched,
          point.x - matchedSize / 2,
          point.y - matchedSize / 2,
          matchedSize,
          matchedSize,
        )
        // A one-pixel core keeps each fragment sharp on high-DPI canvases.
        baseContext.globalAlpha = progress
        baseContext.fillStyle = '#b89b5e'
        baseContext.fillRect(point.x - 0.75, point.y - 0.75, 1.5, 1.5)
      }

      baseContext.globalAlpha = 1
      baseContext.globalCompositeOperation = 'source-over'
    }

    const drawHover = (info: HoverInfo | null) => {
      const data = projectedRef.current
      if (!data) return
      overlayContext.clearRect(0, 0, size.w, size.h)
      if (!info) return

      if (info.matched && info.lens >= 0) {
        const lens = data.lensScreen[info.lens]
        if (lens) {
          overlayContext.strokeStyle = 'rgba(184, 155, 94, 0.6)'
          overlayContext.lineWidth = 1
          overlayContext.beginPath()
          overlayContext.moveTo(info.x, info.y)
          overlayContext.lineTo(lens.x, lens.y)
          overlayContext.stroke()

          overlayContext.strokeStyle = 'rgba(122, 138, 190, 0.72)'
          overlayContext.lineWidth = 1
          overlayContext.beginPath()
          overlayContext.arc(lens.x, lens.y, 4.5, 0, Math.PI * 2)
          overlayContext.stroke()
        }

        overlayContext.strokeStyle = 'rgba(216, 192, 140, 0.9)'
        overlayContext.lineWidth = 1.2
        overlayContext.beginPath()
        overlayContext.arc(info.x, info.y, 7, 0, Math.PI * 2)
        overlayContext.stroke()
      } else {
        overlayContext.strokeStyle = 'rgba(255, 255, 255, 0.28)'
        overlayContext.lineWidth = 1
        overlayContext.beginPath()
        overlayContext.arc(info.x, info.y, 3.5, 0, Math.PI * 2)
        overlayContext.stroke()
      }
    }

    const start = performance.now()
    const animate = () => {
      const time = Math.min(3.4, (performance.now() - start) / 1000)
      drawBase(time)
      if (time < 3.4) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        rafRef.current = null
      }
    }

    setHover(null)
    overlayContext.clearRect(0, 0, size.w, size.h)

    if (reduced) {
      drawBase(3.4)
    } else if (inView) {
      drawBase(0)
      rafRef.current = requestAnimationFrame(animate)
    } else {
      drawBase(0)
    }

    drawHoverRef.current = drawHover

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [payload, lenses, size, inView, reduced, sprites])

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const wrap = wrapRef.current
    const data = projectedRef.current
    if (!wrap || !data) return

    const rect = wrap.getBoundingClientRect()
    const cursorX = event.clientX - rect.left
    const cursorY = event.clientY - rect.top
    const projection = data.projection

    let best: ProjectedPoint | null = null
    let bestDistance = 12 * 12
    for (const point of data.matched) {
      const dx = point.x - cursorX
      const dy = point.y - cursorY
      const distance = dx * dx + dy * dy
      if (distance < bestDistance) {
        bestDistance = distance
        best = point
      }
    }

    if (!best) {
      bestDistance = 8 * 8
      for (const point of data.unmatched) {
        const dx = point.x - cursorX
        const dy = point.y - cursorY
        const distance = dx * dx + dy * dy
        if (distance < bestDistance) {
          bestDistance = distance
          best = point
        }
      }
    }

    if (best) {
      const info: HoverInfo = {
        x: best.x,
        y: best.y,
        cursorX,
        cursorY,
        ra: best.ra,
        dec: best.dec,
        matched: 'matched' in best,
        lens: best.lens,
        sep: best.sep,
      }
      setHover(info)
      drawHoverRef.current(info)
      return
    }

    const coordinates = projection.invert(cursorX, cursorY)
    if (!coordinates) {
      setHover(null)
      drawHoverRef.current(null)
      return
    }

    const info: HoverInfo = {
      x: cursorX,
      y: cursorY,
      cursorX,
      cursorY,
      ra: coordinates.ra,
      dec: coordinates.dec,
      matched: false,
      lens: -1,
      sep: -1,
    }
    setHover(info)
    drawHoverRef.current(info)
  }

  function handlePointerLeave() {
    setHover(null)
    drawHoverRef.current(null)
  }

  const meta = payload?.meta
  const formatCount = (value?: number) =>
    value === undefined ? '—' : value.toLocaleString('en-US')
  const tooltipLeft = hover
    ? Math.max(
        8,
        Math.min(hover.cursorX + 14, Math.max(8, size.w - 210)),
      )
    : 0
  const tooltipTop = hover
    ? Math.max(
        8,
        Math.min(hover.cursorY + 14, Math.max(8, size.h - 92)),
      )
    : 0

  return (
    <figure className="sky-map" ref={figureRef}>
      <div className="sky-map__layout">
        <div className="sky-map__stage">
          <div
            ref={wrapRef}
            className="sky-map__canvas-wrap"
            role="img"
            aria-label="Sky map of 10,000 mock supernovae, 13,941 Lenscat lenses and 6,843 matches."
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <canvas ref={baseRef} className="sky-map__canvas" />
            <canvas
              ref={overlayRef}
              className="sky-map__canvas sky-map__canvas--overlay"
            />

            {(!payload || !lenses) && !failed && (
              <p className="sky-map__status">Loading the sky coverage…</p>
            )}
            {failed && (
              <p className="sky-map__status">
                The sky-coverage catalogue could not be loaded.
              </p>
            )}

            {hover && (
              <div
                className="sky-map__tooltip"
                role="tooltip"
                style={{ left: tooltipLeft, top: tooltipTop }}
              >
                <span className="sky-map__tooltip-coord">
                  RA: {hover.ra.toFixed(1)}°, Dec: {hover.dec.toFixed(1)}°
                </span>
                {hover.matched ? (
                  <>
                    <span className="sky-map__tooltip-match">
                      Matched to Lenscat #{hover.lens + 1}
                    </span>
                    <span className="sky-map__tooltip-meta">
                      Lens separation {hover.sep.toFixed(1)}°
                    </span>
                  </>
                ) : hover.lens >= 0 ? (
                  <>
                    <span className="sky-map__tooltip-meta">
                      No match within 5.7°
                    </span>
                    <span className="sky-map__tooltip-meta">
                      Nearest Lenscat #{hover.lens + 1} ·{' '}
                      {hover.sep.toFixed(1)}°
                    </span>
                  </>
                ) : (
                  <span className="sky-map__tooltip-meta">
                    No matched source near this position
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="sky-map__summary">
          <p className="sky-map__summary-kicker">The coverage</p>
          <dl className="sky-map__stats">
            <div className="sky-map__stat">
              <dt>TOTAL MOCK SNe</dt>
              <dd>{formatCount(meta?.total)}</dd>
            </div>
            <div className="sky-map__stat">
              <dt>MATCHED TO LENSES</dt>
              <dd>{formatCount(meta?.matched)}</dd>
            </div>
            <div className="sky-map__stat sky-map__stat--coverage">
              <dt>SKY COVERAGE</dt>
              <dd>{meta ? `${meta.coverage.toFixed(2)}%` : '—'}</dd>
            </div>
          </dl>

          <ul className="sky-map__legend" aria-label="Sky map legend">
            <li>
              <i className="sky-map__dot sky-map__dot--unmatched" />
              Unmatched SNe
              <b>{formatCount(meta?.unmatched)}</b>
            </li>
            <li>
              <i className="sky-map__dot sky-map__dot--lens" />
              Lenscat lenses
              <b>{formatCount(meta?.lensCount)}</b>
            </li>
            <li>
              <i className="sky-map__dot sky-map__dot--matched" />
              Matched SNe
              <b>{formatCount(meta?.matched)}</b>
            </li>
          </ul>

          <p className="sky-map__note">
            5.7° match radius · Lambert equal-area
          </p>
        </aside>
      </div>

      <p className="sky-map__hint">
        Hover the map to inspect a matched source.
      </p>
      <figcaption className="sky-map__caption">
        Dark points have no lens within 5.7°. Blue points are Lenscat lenses;
        gold points are the 6,843 matches. The map is a Lambert azimuthal
        equal-area projection centred on the north celestial pole.
      </figcaption>
    </figure>
  )
}
