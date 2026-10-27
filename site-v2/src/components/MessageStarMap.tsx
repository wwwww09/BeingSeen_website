import { useEffect, useMemo, useRef, useState } from 'react'
import { STARS, type StoryRecord } from '../lib/messageBoard'

interface MessageStarMapProps {
  stories: StoryRecord[]
  paused: boolean
  reduced: boolean
  onSelect: (index: number) => void
}

const TAU = Math.PI * 2
const HIT_RADIUS = 9
const HIT_RADIUS_SQ = HIT_RADIUS * HIT_RADIUS
const STAR_TWINKLE_INTERVAL = 55

/**
 * The 10,000-star map. The cool star field is redrawn into an offscreen
 * twinkle buffer at a low cadence, then blitted every frame. Lit stars,
 * ignition ripples and the hover highlight stay at full frame rate.
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
    const starCanvas = document.createElement('canvas')
    const starContext = starCanvas.getContext('2d')

    let width = 0
    let height = 0
    let frame = 0
    let lastStarAt = 0

    const drawStarField = (now: number) => {
      if (!starContext) return

      const seconds = now / 1000
      starContext.clearRect(0, 0, width, height)
      starContext.fillStyle = 'rgb(150, 170, 200)'

      for (const star of STARS) {
        const wave = 0.5 + 0.5 * Math.sin(seconds * star.speed + star.phase)
        const alpha = Math.min(
          0.6,
          Math.max(0.2, star.alpha + star.twinkle * wave),
        )
        starContext.globalAlpha = alpha
        starContext.fillRect(
          star.x * width,
          star.y * height,
          star.size,
          star.size,
        )
      }

      starContext.globalAlpha = 1
    }

    const drawFrame = (now: number) => {
      if (width < 2 || height < 2) return

      context.clearRect(0, 0, width, height)
      context.globalCompositeOperation = 'source-over'
      context.globalAlpha = 1
      context.drawImage(starCanvas, 0, 0, width, height)

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
          : 0.78 + 0.22 * Math.sin(now * 0.0018 + story.index * 0.7)
        const glowRadius = 10 + 18 * progress
        const alpha = (0.5 + 0.4 * progress) * pulse

        const glow = context.createRadialGradient(
          x,
          y,
          0,
          x,
          y,
          glowRadius,
        )
        glow.addColorStop(0, `rgba(255, 231, 170, ${0.62 * alpha})`)
        glow.addColorStop(0.22, `rgba(255, 191, 0, ${0.42 * alpha})`)
        glow.addColorStop(0.6, `rgba(255, 148, 42, ${0.12 * alpha})`)
        glow.addColorStop(1, 'rgba(255, 120, 20, 0)')
        context.fillStyle = glow
        context.beginPath()
        context.arc(x, y, glowRadius, 0, TAU)
        context.fill()

        const coreRadius = 1.2 + progress * 1.4
        context.fillStyle = `rgba(255, 244, 205, ${0.78 * alpha})`
        context.beginPath()
        context.arc(x, y, coreRadius, 0, TAU)
        context.fill()

        // Expanding ripple at the moment of ignition.
        const rippleProgress = reducedRef.current
          ? 1
          : Math.min(1, Math.max(0, elapsed / 1500))
        if (rippleProgress < 1) {
          const ringRadius =
            4 + 44 * (1 - Math.pow(1 - rippleProgress, 2))
          const ringAlpha = (1 - rippleProgress) * 0.45
          context.strokeStyle = `rgba(255, 191, 0, ${ringAlpha})`
          context.lineWidth = 1.3 * (1 - rippleProgress) + 0.3
          context.beginPath()
          context.arc(x, y, ringRadius, 0, TAU)
          context.stroke()

          const second = Math.max(0, rippleProgress - 0.16)
          if (second > 0 && second < 1) {
            const secondRadius = 4 + 36 * (1 - Math.pow(1 - second, 2))
            context.strokeStyle = `rgba(255, 214, 140, ${
              (1 - second) * 0.24
            })`
            context.lineWidth = 1
            context.beginPath()
            context.arc(x, y, secondRadius, 0, TAU)
            context.stroke()
          }
        }
      }

      // --- hover highlight ---------------------------------------------
      const hovered = hoveredRef.current
      if (hovered !== null) {
        const star = STARS[hovered]
        if (star) {
          const x = star.x * width
          const y = star.y * height
          const lit = storiesRef.current.some(
            (story) => story.index === hovered,
          )

          context.globalCompositeOperation = 'lighter'
          const hoverGlow = context.createRadialGradient(
            x,
            y,
            0,
            x,
            y,
            11,
          )
          if (lit) {
            hoverGlow.addColorStop(0, 'rgba(255, 235, 180, 0.55)')
            hoverGlow.addColorStop(0.35, 'rgba(255, 191, 0, 0.18)')
            hoverGlow.addColorStop(1, 'rgba(255, 150, 40, 0)')
          } else {
            hoverGlow.addColorStop(0, 'rgba(225, 240, 255, 0.5)')
            hoverGlow.addColorStop(0.35, 'rgba(150, 190, 240, 0.16)')
            hoverGlow.addColorStop(1, 'rgba(120, 160, 220, 0)')
          }
          context.fillStyle = hoverGlow
          context.beginPath()
          context.arc(x, y, 11, 0, TAU)
          context.fill()

          context.fillStyle = lit
            ? 'rgba(255, 240, 195, 1)'
            : 'rgba(235, 245, 255, 1)'
          context.beginPath()
          context.arc(x, y, 2.2, 0, TAU)
          context.fill()

          context.globalCompositeOperation = 'source-over'
          context.strokeStyle = lit
            ? 'rgba(255, 191, 0, 0.7)'
            : 'rgba(190, 215, 255, 0.55)'
          context.lineWidth = 1
          context.beginPath()
          context.arc(x, y, 5.5, 0, TAU)
          context.stroke()
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

      starCanvas.width = Math.max(1, Math.round(width * dpr))
      starCanvas.height = Math.max(1, Math.round(height * dpr))
      if (starContext) starContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      lastStarAt = 0
      drawStarField(performance.now())
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('click', handleClick)

    const loop = (now: number) => {
      if (!pausedRef.current) {
        if (now - lastStarAt >= STAR_TWINKLE_INTERVAL) {
          drawStarField(now)
          lastStarAt = now
        }
        drawFrame(now)
      }
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
