import { useEffect, useRef } from 'react'

interface EinsteinRingProps {
  animate?: boolean
}

type SparkTone = 'blue' | 'silver'

interface ArcSpec {
  start: number
  span: number
  radius: number
  squash: number
  tilt: number
  phase: number
  width: number
  alpha: number
  count: number
}

interface Spark {
  t: number
  speed: number
  offset: number
  size: number
  phase: number
  tone: SparkTone
  glow: boolean
}

interface Arc extends ArcSpec {
  sparks: Spark[]
}

const TAU = Math.PI * 2

/*
 * Three unequal, non-closing lensed arcs. Their different radii, tilts and
 * spans keep the cold light broken instead of turning it into a ringed
 * planet. The warm elliptical galaxy at the centre is the lens itself.
 */
const ARC_SPECS: ArcSpec[] = [
  {
    start: -2.24,
    span: 1.9,
    radius: 0.33,
    squash: 0.9,
    tilt: -0.22,
    phase: 0.35,
    width: 1.15,
    alpha: 0.6,
    count: 300,
  },
  {
    start: 0.35,
    span: 1.35,
    radius: 0.352,
    squash: 0.93,
    tilt: -0.12,
    phase: 1.85,
    width: 0.9,
    alpha: 0.46,
    count: 220,
  },
  {
    start: 2.18,
    span: 1.15,
    radius: 0.318,
    squash: 0.87,
    tilt: -0.27,
    phase: 3.1,
    width: 0.72,
    alpha: 0.36,
    count: 160,
  },
]

function buildArcs(): Arc[] {
  return ARC_SPECS.map((arc) => ({
    ...arc,
    sparks: Array.from({ length: arc.count }, () => ({
      t: Math.random(),
      speed: 0.7 + Math.random() * 0.6,
      offset: (Math.random() - 0.5) * 0.055,
      size: 0.45 + Math.random() ** 2 * 1.0,
      phase: Math.random() * TAU,
      tone: Math.random() < 0.18 ? 'silver' : 'blue',
      glow: Math.random() < 0.08,
    })),
  }))
}

/**
 * Hubble-style lensing diagram: a small warm elliptical galaxy at the centre,
 * surrounded by two or three broken cold-blue arcs of stretched background
 * light. The arcs breathe and drift almost imperceptibly; the overall opacity
 * stays between 0.55 and 0.78. Decorative only: no pointer events, no screen
 * reader content.
 */
export function EinsteinRing({ animate = true }: EinsteinRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Fine arcs need a real 2x buffer even on 1x displays.
    const dpr = 2
    const arcs = buildArcs()

    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    const startedAt = performance.now()

    const drawFrame = (now: number) => {
      if (width < 2 || height < 2) return

      const time = animate ? (now - startedAt) / 1000 : 0.8
      const breath = animate ? 0.66 + 0.12 * Math.sin(time * 0.26) : 0.72
      const systemRotation = animate ? time * 0.0012 : 0.08

      const centerX = width * 0.5
      const centerY = height * 0.5
      const minSide = Math.min(width, height)
      const baseRadius = minSide * 0.335
      const galaxyCore = minSide * 0.042
      const galaxyHalo = minSide * 0.105

      context.clearRect(0, 0, width, height)
      context.globalAlpha = breath
      context.globalCompositeOperation = 'lighter'
      context.lineCap = 'round'

      // --- cold, broken lensed arcs -------------------------------------
      for (const arc of arcs) {
        const start = arc.start + systemRotation
        const slowBreath =
          1 + 0.005 * Math.sin(time * 0.22 + arc.phase)
        const radius = baseRadius * arc.radius * slowBreath

        context.save()
        context.translate(centerX, centerY)
        context.rotate(arc.tilt)
        context.scale(1, arc.squash)

        // Very soft halo behind the arc, not a solid band.
        context.beginPath()
        context.arc(0, 0, radius, start, start + arc.span)
        context.lineWidth = arc.width * 4.2
        context.strokeStyle = `rgba(93, 138, 168, ${arc.alpha * 0.075})`
        context.stroke()

        // Tapered body, drawn in short overlapping arc segments so the
        // ends dissolve and the brightness can knot along the arc.
        const segments = 96
        for (let index = 0; index < segments; index += 1) {
          const t0 = index / segments
          const t1 = Math.min(1, (index + 1.7) / segments)
          const edge = Math.max(
            0,
            Math.min(1, t0 / 0.1, (1 - t0) / 0.1),
          )
          const knot =
            0.58 +
            0.42 *
              Math.pow(
                0.5 + 0.5 * Math.sin(t0 * 11 + arc.phase * 2.3),
                2,
              )
          const shimmer =
            0.9 + 0.1 * Math.sin(time * 0.5 + t0 * 8 + arc.phase)
          const alpha = arc.alpha * edge * knot * shimmer
          if (alpha < 0.012) continue

          context.beginPath()
          context.arc(
            0,
            0,
            radius,
            start + t0 * arc.span,
            start + t1 * arc.span,
          )
          context.lineWidth =
            arc.width * (0.7 + 0.3 * Math.sin(t0 * Math.PI))
          context.strokeStyle = `rgba(93, 138, 168, ${alpha})`
          context.stroke()
        }

        // Stretched background stars scattered around the arc.
        for (const spark of arc.sparks) {
          let t = spark.t + time * spark.speed * 0.0015
          t -= Math.floor(t)

          const edge = Math.max(
            0,
            Math.min(1, t / 0.08, (1 - t) / 0.08),
          )
          if (edge <= 0) continue

          const angle = start + t * arc.span
          const sparkRadius =
            radius *
            (1 +
              spark.offset +
              Math.sin(time * 0.18 + spark.phase) * 0.003)
          const x = Math.cos(angle) * sparkRadius
          const y = Math.sin(angle) * sparkRadius

          const twinkle =
            0.55 + 0.45 * Math.sin(time * 0.8 + spark.phase)
          const alpha = edge * (0.22 + 0.5 * twinkle)
          if (alpha < 0.02) continue

          if (spark.glow) {
            context.fillStyle =
              spark.tone === 'silver'
                ? `rgba(190, 210, 225, ${alpha * 0.14})`
                : `rgba(93, 138, 168, ${alpha * 0.18})`
            context.beginPath()
            context.arc(x, y, spark.size * 3.2, 0, TAU)
            context.fill()
          }

          context.fillStyle =
            spark.tone === 'silver'
              ? `rgba(190, 210, 225, ${alpha})`
              : `rgba(93, 138, 168, ${alpha})`
          context.beginPath()
          context.arc(x, y, spark.size, 0, TAU)
          context.fill()
        }

        context.restore()
      }

      // --- warm elliptical lens galaxy ----------------------------------
      context.save()
      context.translate(centerX, centerY)
      context.rotate(-0.24)
      context.scale(1, 0.68)

      const halo = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        galaxyHalo,
      )
      halo.addColorStop(0, 'rgba(248, 186, 120, 0.18)')
      halo.addColorStop(0.4, 'rgba(212, 130, 74, 0.075)')
      halo.addColorStop(0.75, 'rgba(150, 78, 42, 0.02)')
      halo.addColorStop(1, 'rgba(120, 60, 30, 0)')
      context.fillStyle = halo
      context.beginPath()
      context.arc(0, 0, galaxyHalo, 0, TAU)
      context.fill()

      const core = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        galaxyCore,
      )
      core.addColorStop(0, 'rgba(255, 244, 218, 0.88)')
      core.addColorStop(0.18, 'rgba(255, 222, 170, 0.75)')
      core.addColorStop(0.45, 'rgba(240, 170, 100, 0.4)')
      core.addColorStop(0.75, 'rgba(186, 100, 56, 0.08)')
      core.addColorStop(1, 'rgba(120, 50, 25, 0)')
      context.fillStyle = core
      context.beginPath()
      context.arc(0, 0, galaxyCore, 0, TAU)
      context.fill()

      context.fillStyle = 'rgba(255, 250, 235, 0.95)'
      context.beginPath()
      context.arc(0, 0, 1.8, 0, TAU)
      context.fill()

      context.restore()

      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.round(rect.width)
      height = Math.round(rect.height)
      if (width < 2 || height < 2) return

      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!animate) drawFrame(startedAt)
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
      },
      { threshold: 0.01 },
    )
    intersectionObserver.observe(canvas)

    if (animate) {
      const tick = (now: number) => {
        if (visible) drawFrame(now)
        frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    }

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [animate])

  return <canvas ref={canvasRef} className="einstein-ring" aria-hidden="true" />
}
