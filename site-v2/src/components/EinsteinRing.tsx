import { useEffect, useRef } from 'react'

interface EinsteinRingProps {
  animate?: boolean
}

interface ArcSpec {
  start: number
  span: number
  radius: number
  squash: number
  tilt: number
  phase: number
  alpha: number
  sparkCount: number
}

interface Spark {
  t: number
  offset: number
  size: number
  phase: number
  alpha: number
  silver: boolean
}

interface Arc extends ArcSpec {
  sparks: Spark[]
}

interface BackgroundStar {
  x: number
  y: number
  size: number
  phase: number
  alpha: number
  warm: boolean
}

const TAU = Math.PI * 2

/*
 * Three unequal, non-closing lensed arcs. Their different radii, tilts and
 * spans keep the cold light broken instead of turning it into a ringed
 * planet. The warm elliptical galaxy at the centre is the lens itself.
 */
const ARC_SPECS: ArcSpec[] = [
  {
    start: -2.2,
    span: 1.72,
    radius: 0.312,
    squash: 0.9,
    tilt: -0.22,
    phase: 0.35,
    alpha: 0.6,
    sparkCount: 26,
  },
  {
    start: 0.32,
    span: 1.38,
    radius: 0.336,
    squash: 0.93,
    tilt: -0.1,
    phase: 1.85,
    alpha: 0.46,
    sparkCount: 18,
  },
  {
    start: 2.12,
    span: 1.06,
    radius: 0.294,
    squash: 0.87,
    tilt: -0.28,
    phase: 3.1,
    alpha: 0.36,
    sparkCount: 12,
  },
]

function buildArcs(): Arc[] {
  return ARC_SPECS.map((arc) => ({
    ...arc,
    sparks: Array.from({ length: arc.sparkCount }, () => ({
      t: Math.random(),
      offset: (Math.random() - 0.5) * 0.055,
      size: 0.45 + Math.random() ** 2 * 0.85,
      phase: Math.random() * TAU,
      alpha: 0.1 + Math.random() * 0.22,
      silver: Math.random() < 0.25,
    })),
  }))
}

function makeGrain(width: number, height: number, dpr: number) {
  const grain = document.createElement('canvas')
  grain.width = Math.max(1, Math.round(width * dpr))
  grain.height = Math.max(1, Math.round(height * dpr))

  const grainContext = grain.getContext('2d')
  if (!grainContext) return null
  grainContext.setTransform(dpr, 0, 0, dpr, 0, 0)

  const size = 128
  const noise = document.createElement('canvas')
  noise.width = size
  noise.height = size

  const noiseContext = noise.getContext('2d')
  if (!noiseContext) return null

  const image = noiseContext.createImageData(size, size)
  for (let index = 0; index < image.data.length; index += 4) {
    // Most pixels stay transparent; the rest become fine film grain.
    if (Math.random() > 0.085) continue
    const value = 150 + Math.random() * 105
    image.data[index] = value
    image.data[index + 1] = value
    image.data[index + 2] = Math.min(255, value + 12)
    image.data[index + 3] = 45 + Math.random() * 115
  }
  noiseContext.putImageData(image, 0, 0)

  const pattern = grainContext.createPattern(noise, 'repeat')
  if (!pattern) return null

  grainContext.fillStyle = pattern
  grainContext.fillRect(0, 0, width, height)

  // Fade the grain out radially so the canvas never shows a rectangular
  // patch against the pure-black page.
  const centerX = width * 0.5
  const centerY = height * 0.5
  const minSide = Math.min(width, height)
  const mask = grainContext.createRadialGradient(
    centerX,
    centerY,
    minSide * 0.06,
    centerX,
    centerY,
    minSide * 0.52,
  )
  mask.addColorStop(0, 'rgba(0, 0, 0, 1)')
  mask.addColorStop(0.55, 'rgba(0, 0, 0, 0.5)')
  mask.addColorStop(1, 'rgba(0, 0, 0, 0)')
  grainContext.globalCompositeOperation = 'destination-in'
  grainContext.fillStyle = mask
  grainContext.fillRect(0, 0, width, height)

  return grain
}

/**
 * A soft, photographic lensing study rather than a geometric diagram:
 * a fuzzy warm elliptical galaxy at the centre, three blurred cold-blue
 * arcs of stretched background light, a faint field of background stars
 * and a static film grain. Decorative only.
 */
export function EinsteinRing({ animate = true }: EinsteinRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    // Fine gradients and grain need a real 2x buffer on 1x displays too.
    const dpr = 2
    const arcs = buildArcs()
    const backgroundStars: BackgroundStar[] = Array.from(
      { length: 80 },
      () => ({
        x: Math.random(),
        y: Math.random(),
        size: 0.4 + Math.random() * 0.9,
        phase: Math.random() * TAU,
        alpha: 0.08 + Math.random() * 0.28,
        warm: Math.random() < 0.12,
      }),
    )

    let grainCanvas: HTMLCanvasElement | null = null
    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    const startedAt = performance.now()

    const drawFrame = (now: number) => {
      if (width < 2 || height < 2) return

      const time = animate ? (now - startedAt) / 1000 : 0.8
      const breath = animate ? 0.66 + 0.1 * Math.sin(time * 0.26) : 0.72
      const systemRotation = animate ? time * 0.0008 : 0.06

      const centerX = width * 0.5
      const centerY = height * 0.5
      const minSide = Math.min(width, height)
      const galaxyHalo = minSide * 0.24
      const galaxyCore = minSide * 0.07

      context.clearRect(0, 0, width, height)
      context.globalAlpha = breath
      context.globalCompositeOperation = 'lighter'

      // --- faint background stars ---------------------------------------
      for (const star of backgroundStars) {
        const twinkle =
          0.6 + 0.4 * Math.sin(time * 0.55 + star.phase)
        const alpha = star.alpha * twinkle
        context.fillStyle = star.warm
          ? `rgba(232, 194, 145, ${alpha})`
          : `rgba(150, 180, 215, ${alpha})`
        context.beginPath()
        context.arc(
          star.x * width,
          star.y * height,
          star.size,
          0,
          TAU,
        )
        context.fill()
      }

      // --- blurred, broken lensed arcs ----------------------------------
      for (const arc of arcs) {
        const start = arc.start + systemRotation
        const end = start + arc.span
        const slowBreath =
          1 + 0.004 * Math.sin(time * 0.16 + arc.phase)
        const radius = minSide * arc.radius * slowBreath
        const alpha =
          arc.alpha * (0.9 + 0.1 * Math.sin(time * 0.2 + arc.phase))

        context.save()
        context.translate(centerX, centerY)
        context.rotate(arc.tilt)
        context.scale(1, arc.squash)
        context.lineCap = 'round'

        // Wide, almost invisible atmospheric bloom.
        context.filter = 'blur(7px)'
        context.beginPath()
        context.arc(0, 0, radius, start, end)
        context.lineWidth = 10
        context.strokeStyle = `rgba(108, 160, 220, ${alpha * 0.13})`
        context.stroke()

        // The soft body of the stretched background galaxy.
        context.filter = 'blur(2.2px)'
        context.beginPath()
        context.arc(0, 0, radius, start, end)
        context.lineWidth = 2.4
        context.strokeStyle = `rgba(140, 185, 235, ${alpha * 0.58})`
        context.stroke()

        // A thin silver thread inside the blur.
        context.filter = 'blur(0.6px)'
        context.beginPath()
        context.arc(0, 0, radius, start, end)
        context.lineWidth = 0.7
        context.strokeStyle = `rgba(200, 220, 240, ${alpha * 0.34})`
        context.stroke()

        // A few sparse specks, never a dotted line.
        for (const spark of arc.sparks) {
          const angle = start + spark.t * arc.span
          const sparkRadius =
            radius *
            (1 +
              spark.offset +
              Math.sin(time * 0.25 + spark.phase) * 0.002)
          const x = Math.cos(angle) * sparkRadius
          const y = Math.sin(angle) * sparkRadius
          const twinkle =
            0.55 + 0.45 * Math.sin(time * 0.7 + spark.phase)
          const sparkAlpha = spark.alpha * twinkle
          context.fillStyle = spark.silver
            ? `rgba(200, 220, 240, ${sparkAlpha})`
            : `rgba(108, 160, 220, ${sparkAlpha})`
          context.beginPath()
          context.arc(x, y, spark.size, 0, TAU)
          context.fill()
        }

        context.filter = 'none'
        context.restore()
      }

      // --- fuzzy elliptical lens galaxy ---------------------------------
      context.save()
      context.translate(centerX, centerY)
      context.rotate(-0.24)
      context.scale(1, 0.68)

      context.filter = 'blur(4px)'
      const halo = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        galaxyHalo,
      )
      halo.addColorStop(0, 'rgba(255, 236, 205, 0.5)')
      halo.addColorStop(0.15, 'rgba(255, 210, 150, 0.28)')
      halo.addColorStop(0.38, 'rgba(225, 140, 85, 0.12)')
      halo.addColorStop(0.66, 'rgba(140, 64, 40, 0.035)')
      halo.addColorStop(0.88, 'rgba(70, 28, 20, 0.01)')
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = halo
      context.beginPath()
      context.arc(0, 0, galaxyHalo, 0, TAU)
      context.fill()

      context.filter = 'blur(1.5px)'
      const core = context.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        galaxyCore,
      )
      core.addColorStop(0, 'rgba(255, 252, 240, 0.98)')
      core.addColorStop(0.12, 'rgba(255, 240, 205, 0.9)')
      core.addColorStop(0.32, 'rgba(255, 214, 155, 0.7)')
      core.addColorStop(0.6, 'rgba(240, 160, 95, 0.35)')
      core.addColorStop(0.85, 'rgba(170, 80, 50, 0.08)')
      core.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = core
      context.beginPath()
      context.arc(0, 0, galaxyCore, 0, TAU)
      context.fill()

      context.filter = 'none'
      context.fillStyle = 'rgba(255, 249, 232, 0.86)'
      context.beginPath()
      context.arc(0, 0, 1.7, 0, TAU)
      context.fill()
      context.restore()

      // --- static film grain --------------------------------------------
      if (grainCanvas) {
        context.globalCompositeOperation = 'screen'
        context.globalAlpha = 0.14
        context.drawImage(grainCanvas, 0, 0, width, height)
      }

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
      grainCanvas = makeGrain(width, height, dpr)
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
