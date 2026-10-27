import { useEffect, useRef } from 'react'

interface EinsteinRingProps {
  animate?: boolean
}

type DustTone = 'gold' | 'blue'

interface ArcSpec {
  start: number
  span: number
  radius: number
  squash: number
  tilt: number
  goldBias: number
  count: number
}

interface Dust {
  t: number
  speed: number
  offset: number
  size: number
  phase: number
  tone: DustTone
  glow: boolean
}

interface Arc extends ArcSpec {
  dust: Dust[]
}

const TAU = Math.PI * 2

/*
 * Three broken, almost concentric light paths. Different starts, spans and
 * tilts keep the ring from closing into a geometric circle: it should read
 * as bent background light, not as a drawn halo.
 */
const ARC_SPECS: ArcSpec[] = [
  {
    start: -2.62,
    span: 4.72,
    radius: 0.985,
    squash: 0.9,
    tilt: -0.22,
    goldBias: 0.72,
    count: 2400,
  },
  {
    start: 0.24,
    span: 4.38,
    radius: 1,
    squash: 0.93,
    tilt: -0.17,
    goldBias: 0.34,
    count: 1900,
  },
  {
    start: -1.36,
    span: 3.86,
    radius: 1.014,
    squash: 0.88,
    tilt: -0.25,
    goldBias: 0.56,
    count: 1200,
  },
]

function buildArcs(): Arc[] {
  return ARC_SPECS.map((arc) => ({
    ...arc,
    dust: Array.from({ length: arc.count }, () => ({
      t: Math.random(),
      speed: 0.75 + Math.random() * 0.5,
      offset: (Math.random() - 0.5) * 0.008,
      size: 0.3 + Math.random() ** 2 * 0.8,
      phase: Math.random() * TAU,
      tone: Math.random() < arc.goldBias ? 'gold' : 'blue',
      glow: Math.random() < 0.06,
    })),
  }))
}

/**
 * A restrained Einstein ring for the Science overview. Three non-closing
 * arcs of dust bend around a tiny dark lens; the particles drift slowly and
 * breathe between 0.5 and 0.8 opacity. There is no solid ring band and no
 * bright central disc. The canvas is decorative, so it ignores pointer
 * events and is hidden from assistive technology.
 */
export function EinsteinRing({ animate = true }: EinsteinRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2) || 1
    const arcs = buildArcs()

    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    const startedAt = performance.now()

    const drawFrame = (now: number) => {
      if (width < 2 || height < 2) return

      const time = animate ? (now - startedAt) / 1000 : 0.8
      const breath = animate ? 0.64 + 0.13 * Math.sin(time * 0.28) : 0.66
      const systemRotation = animate ? time * 0.0022 : 0.2
      const centerX = width * 0.52
      const centerY = height * 0.5
      const baseRadius = Math.min(width, height) * 0.34

      context.clearRect(0, 0, width, height)
      context.globalAlpha = breath
      context.globalCompositeOperation = 'lighter'

      for (const arc of arcs) {
        context.save()
        context.translate(centerX, centerY)
        context.rotate(arc.tilt)
        context.scale(1, arc.squash)

        for (const dust of arc.dust) {
          let t = dust.t + time * dust.speed * 0.0035
          t -= Math.floor(t)

          // Endpoints dissolve so the arc never closes.
          const edge = Math.max(0, Math.min(1, t / 0.07, (1 - t) / 0.07))
          if (edge <= 0) continue

          const angle = arc.start + t * arc.span + systemRotation
          const radius =
            baseRadius *
            arc.radius *
            (1 +
              dust.offset +
              Math.sin(time * 0.2 + dust.phase) * 0.0008)
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius

          const grain =
            0.35 +
            0.65 *
              Math.pow(0.5 + 0.5 * Math.sin(t * 83 + dust.phase), 2)
          const shimmer = 0.72 + 0.28 * Math.sin(time * 0.6 + dust.phase)
          const alpha =
            edge *
            grain *
            shimmer *
            (dust.tone === 'gold' ? 0.2 : 0.25)
          if (alpha < 0.012) continue

          if (dust.glow) {
            context.fillStyle =
              dust.tone === 'gold'
                ? `rgba(212, 175, 55, ${alpha * 0.12})`
                : `rgba(74, 78, 105, ${alpha * 0.18})`
            context.beginPath()
            context.arc(x, y, dust.size * 3.4, 0, TAU)
            context.fill()
          }

          context.fillStyle =
            dust.tone === 'gold'
              ? `rgba(212, 175, 55, ${alpha})`
              : `rgba(74, 78, 105, ${alpha})`
          context.beginPath()
          context.arc(x, y, dust.size, 0, TAU)
          context.fill()
        }

        context.restore()
      }

      // The lens: a tiny, almost-black point with a soft cool haze. No rim,
      // no filled disc — just enough darkness to anchor the bent light.
      const lens = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        15,
      )
      lens.addColorStop(0, 'rgba(0, 0, 0, 0.98)')
      lens.addColorStop(0.34, 'rgba(0, 0, 0, 0.9)')
      lens.addColorStop(0.64, 'rgba(20, 22, 34, 0.22)')
      lens.addColorStop(1, 'rgba(74, 78, 105, 0)')
      context.fillStyle = lens
      context.beginPath()
      context.arc(centerX, centerY, 15, 0, TAU)
      context.fill()

      context.fillStyle = 'rgba(212, 175, 55, 0.22)'
      context.beginPath()
      context.arc(centerX, centerY, 0.8, 0, TAU)
      context.fill()

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
