import { useEffect, useRef } from 'react'

interface EinsteinRingProps {
  animate?: boolean
}

type ParticleTone = 'gold' | 'blue' | 'white'

interface Particle {
  angle: number
  offset: number
  size: number
  phase: number
  speed: number
  tone: ParticleTone
  bright: boolean
}

const TAU = Math.PI * 2

/**
 * A quiet Einstein ring for the Science overview. The ring is drawn from
 * stardust on a transparent canvas, with a very slow orbital drift and a
 * 0.5–0.8 opacity breath. It is decorative only, so it never receives
 * pointer events and is hidden from assistive technology.
 */
export function EinsteinRing({ animate = true }: EinsteinRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2) || 1
    const particles: Particle[] = Array.from({ length: 760 }, () => {
      const roll = Math.random()
      return {
        angle: Math.random() * TAU,
        offset: (Math.random() - 0.5) * 0.05,
        size: 0.35 + Math.random() ** 2 * 1.15,
        phase: Math.random() * TAU,
        speed: 0.55 + Math.random() * 0.9,
        tone: roll < 0.68 ? 'gold' : roll < 0.92 ? 'blue' : 'white',
        bright: Math.random() < 0.06,
      }
    })

    let width = 0
    let height = 0
    let frame = 0
    let visible = true
    const startedAt = performance.now()

    const drawFrame = (now: number) => {
      if (width < 2 || height < 2) return

      const time = animate ? (now - startedAt) / 1000 : 0.8
      const breath = animate ? 0.65 + 0.15 * Math.sin(time * 0.3) : 0.66
      const rotation = animate ? time * 0.018 : 0.4
      const centerX = width * 0.52
      const centerY = height * 0.5
      const radius = Math.min(width, height) * 0.335

      context.clearRect(0, 0, width, height)
      context.globalAlpha = breath

      context.save()
      context.translate(centerX, centerY)
      context.rotate(-0.22)
      context.scale(1, 0.9)

      // A thin, almost invisible band of light behind the dust.
      const band = context.createRadialGradient(
        0,
        0,
        radius * 0.52,
        0,
        0,
        radius * 1.18,
      )
      band.addColorStop(0, 'rgba(212, 175, 55, 0)')
      band.addColorStop(0.45, 'rgba(143, 183, 255, 0.02)')
      band.addColorStop(0.66, 'rgba(212, 175, 55, 0.035)')
      band.addColorStop(0.82, 'rgba(226, 196, 128, 0.075)')
      band.addColorStop(1, 'rgba(212, 175, 55, 0)')
      context.fillStyle = band
      context.beginPath()
      context.arc(0, 0, radius * 1.18, 0, TAU)
      context.fill()

      context.globalCompositeOperation = 'lighter'
      for (const particle of particles) {
        const angle = particle.angle + rotation * particle.speed
        const radial =
          radius *
          (1 +
            particle.offset +
            Math.sin(time * 0.35 + particle.phase) * 0.004)
        const x = Math.cos(angle) * radial
        const y = Math.sin(angle) * radial

        // Two brighter arcs keep the ring from reading as a perfect circle.
        const arc =
          0.35 +
          0.65 * Math.pow(Math.max(0, Math.sin(angle * 2 + 0.9)), 2)
        const twinkle =
          0.62 + 0.38 * Math.sin(time * 0.9 + particle.phase)
        const alpha = arc * twinkle * (particle.bright ? 0.8 : 0.48)
        if (alpha < 0.015) continue

        const particleColor =
          particle.tone === 'blue'
            ? `rgba(143, 183, 255, ${alpha})`
            : particle.tone === 'white'
              ? `rgba(210, 225, 245, ${alpha})`
              : `rgba(226, 196, 128, ${alpha})`

        if (particle.bright) {
          context.fillStyle =
            particle.tone === 'blue'
              ? `rgba(143, 183, 255, ${alpha * 0.16})`
              : particle.tone === 'white'
                ? `rgba(210, 225, 245, ${alpha * 0.16})`
                : `rgba(226, 196, 128, ${alpha * 0.16})`
          context.beginPath()
          context.arc(x, y, particle.size * 4.2, 0, TAU)
          context.fill()
        }

        context.fillStyle = particleColor
        context.beginPath()
        context.arc(x, y, particle.size, 0, TAU)
        context.fill()
      }
      context.restore()

      // The lens itself: an almost-black sphere with a cool rim.
      const core = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 0.26,
      )
      core.addColorStop(0, 'rgba(0, 0, 0, 0.99)')
      core.addColorStop(0.68, 'rgba(0, 0, 0, 0.97)')
      core.addColorStop(0.88, 'rgba(2, 4, 8, 0.94)')
      core.addColorStop(0.96, 'rgba(143, 183, 255, 0.02)')
      core.addColorStop(1, 'rgba(0, 0, 0, 0)')
      context.fillStyle = core
      context.beginPath()
      context.arc(centerX, centerY, radius * 0.26, 0, TAU)
      context.fill()

      const glint = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius * 0.04,
      )
      glint.addColorStop(0, 'rgba(205, 222, 255, 0.13)')
      glint.addColorStop(1, 'rgba(143, 183, 255, 0)')
      context.fillStyle = glint
      context.beginPath()
      context.arc(centerX, centerY, radius * 0.04, 0, TAU)
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
