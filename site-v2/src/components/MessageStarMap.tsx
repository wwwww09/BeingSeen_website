import { useEffect, useMemo, useRef, useState } from 'react'
import { STARS, type StoryRecord } from '../lib/messageBoard'

interface MessageStarMapProps {
  stories: StoryRecord[]
  paused: boolean
  reduced: boolean
  onSelect: (index: number) => void
}

const TAU = Math.PI * 2
const HIT_RADIUS = 5
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS

/**
 * The 10,000-star map. The unlit field is pre-rendered once per resize and
 * blitted each frame; only the lit stories and the hover ring are dynamic.
 * That keeps the map fast while still allowing the amber ignition to breathe.
 */
export function MessageStarMap({
  stories,
  paused,
  reduced,
  onSelect,
}: MessageStarMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const storiesRef = useRef(stories)
  storiesRef.current = stories

  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const reducedRef = useRef(reduced)
  reducedRef.current = reduced

  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const hoveredRef = useRef<number | null>(null)

  const storyByIndex = useMemo(
    () => new Map(stories.map((story) => [story.index, story])),
    [stories],
  )

  const hoveredStory =
    hoveredIndex === null ? null : storyByIndex.get(hoveredIndex) ?? null

  useEffect(() => {
    if (!paused) return
    hoveredRef.current = null
    setHoveredIndex(null)
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = 2
    const baseCanvas = document.createElement('canvas')
    const baseContext = baseCanvas.getContext('2d')

    let width = 0
    let height = 0
    let frame = 0

    const buildBase = () => {
      baseCanvas.width = Math.max(1, Math.round(width * dpr))
      baseCanvas.height = Math.max(1, Math.round(height * dpr))
      if (!baseContext) return

      baseContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      baseContext.clearRect(0, 0, width, height)

      for (const star of STARS) {
        baseContext.fillStyle = `rgba(255, 255, 255, ${star.alpha})`
        baseContext.fillRect(
          star.x * width,
          star.y * height,
          star.size,
          star.size,
        )
      }
    }

    const drawFrame = (now: number) => {
      if (width < 2 || height < 2) return

      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      context.drawImage(baseCanvas, 0, 0, width, height)

      // --- lit stories ------------------------------------------------
      context.globalCompositeOperation = 'lighter'
      for (const story of storiesRef.current) {
        const star = STARS[story.index]
        if (!star) continue

        const x = star.x * width
        const y = star.y * height
        const elapsed = Date.now() - story.createdAt
        const rawProgress = reducedRef.current
          ? 1
          : Math.min(1, Math.max(0, elapsed / 1200))
        const progress = 1 - Math.pow(1 - rawProgress, 3)
        const pulse = reducedRef.current
          ? 0.9
          : 0.82 + 0.18 * Math.sin(now * 0.0016 + story.index * 0.7)
        const glowRadius = 7 + 11 * progress
        const alpha = (0.45 + 0.4 * progress) * pulse

        if (rawProgress <= 0) continue

        const glow = context.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          glowRadius,
        )
        glow.addColorStop(0, `rgba(255, 231, 170, ${0.62 * alpha})`)
        glow.addColorStop(0.22, `rgba(255, 191, 0, ${0.4 * alpha})`)
        glow.addColorStop(0.6, `rgba(255, 148, 42, ${0.1 * alpha})`)
        glow.addColorStop(1, 'rgba(255, 120, 20, 0)')
        context.fillStyle = glow
        context.beginPath()
        context.arc(x, y, glowRadius, 0, TAU)
        context.fill()

        const coreRadius = 0.9 + progress * 1.2
        context.fillStyle = `rgba(255, 244, 205, ${0.7 * alpha})`
        context.beginPath()
        context.arc(x, y, coreRadius, 0, TAU)
        context.fill()
      }

      // --- hover ring --------------------------------------------------
      const hovered = hoveredRef.current
      if (hovered !== null) {
        const star = STARS[hovered]
        if (star) {
          const x = star.x * width
          const y = star.y * height
          const lit = storiesRef.current.some(
            (story) => story.index === hovered,
          )
          context.globalCompositeOperation = 'source-over'
          context.strokeStyle = lit
            ? 'rgba(255, 191, 0, 0.65)'
            : 'rgba(255, 255, 255, 0.38)'
          context.lineWidth = 1
          context.beginPath()
          context.arc(x, y, 4.5, 0, TAU)
          context.stroke()

          context.fillStyle = lit
            ? 'rgba(255, 215, 130, 0.85)'
            : 'rgba(255, 255, 255, 0.64)'
          context.beginPath()
          context.arc(x, y, 0.9, 0, TAU)
          context.fill()
        }
      }

      context.globalCompositeOperation = 'source-over'
    }

    const findStar = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top

      let best = -1
      let bestDistance = HIT_RADIUS_SQ

      for (const star of STARS) {
        const dx = star.x * width - x
        const dy = star.y * height - y
        const distance = dx * dx + dy * dy
        if (distance < bestDistance) {
          best = star.index
          bestDistance = distance
        }
      }

      return best
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return

      const index = findStar(event.clientX, event.clientY)
      const rect = canvas.getBoundingClientRect()

      if (index < 0) {
        canvas.style.cursor = 'default'
        if (hoveredRef.current !== null) {
          hoveredRef.current = null
          setHoveredIndex(null)
        }
        return
      }

      canvas.style.cursor = 'pointer'
      if (hoveredRef.current !== index) {
        hoveredRef.current = index
        setHoveredIndex(index)
      }

      const tooltip = tooltipRef.current
      if (!tooltip) return

      let left = event.clientX - rect.left + 14
      let top = event.clientY - rect.top + 14
      const tooltipWidth = tooltip.offsetWidth || 220
      const tooltipHeight = tooltip.offsetHeight || 36

      if (left + tooltipWidth > rect.width - 8) {
        left = event.clientX - rect.left - tooltipWidth - 14
      }
      if (top + tooltipHeight > rect.height - 8) {
        top = event.clientY - rect.top - tooltipHeight - 14
      }

      left = Math.max(8, left)
      top = Math.max(8, top)
      tooltip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(
        top,
      )}px, 0)`
    }

    const handlePointerLeave = () => {
      canvas.style.cursor = 'default'
      hoveredRef.current = null
      setHoveredIndex(null)
    }

    const handleClick = (event: MouseEvent) => {
      const index = findStar(event.clientX, event.clientY)
      if (index >= 0) onSelectRef.current(index)
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.round(rect.width)
      height = Math.round(rect.height)
      if (width < 2 || height < 2) return

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      buildBase()
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('click', handleClick)

    const loop = (now: number) => {
      if (!pausedRef.current) drawFrame(now)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <div className="message-map__field">
      <canvas
        ref={canvasRef}
        className="message-map__canvas"
        role="img"
        aria-label="Interactive map of 10,000 faint stars. Choose a dark star to leave an anonymous story, or click a lit star to read one."
      />
      <div
        ref={tooltipRef}
        className="message-map__tooltip"
        data-visible={hoveredIndex !== null ? 'true' : 'false'}
        data-lit={hoveredStory ? 'true' : 'false'}
        role="status"
        aria-live="polite"
      >
        {hoveredStory
          ? 'A story lives here. Click to read it.'
          : hoveredIndex !== null
            ? 'A forgotten star. Tell its story.'
            : null}
      </div>
    </div>
  )
}
