import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function ParticleCamera({
  progress,
  intro: introProgress,
}: {
  progress: MotionValue<number>
  intro?: MotionValue<number>
}) {
  const { camera, size } = useThree()
  const compact = size.width < 900

  useFrame((state) => {
    const introP = introProgress ? clamp01(introProgress.get()) : 1
    const p = introP < 1 ? 0 : clamp01(progress.get())
    const t = state.clock.elapsedTime
    const intro = smooth(p / 0.2)
    const orbit = smooth((p - 0.35) / 0.15) * 0.28
    const pull = smooth((p - 0.5) / 0.1)
    const zoomOut = smooth((p - 0.65) / 0.15)
    const stage2 = smooth((p - 0.2) / 0.08) * (1 - smooth((p - 0.4) / 0.06))
    const stage5 = smooth((p - 0.8) / 0.2)
    const flash = Math.exp(-Math.pow((p - 0.5) / 0.008, 2))

    const groupX = compact ? 0 : 0.7
    const lookX = compact ? 0.1 : 0.2
    const lookY = compact ? 1.5 : 1.0
    const z = 5.0 - 0.4 * intro + 0.8 * pull + 5.6 * zoomOut
    const x = groupX + Math.sin(orbit) * 0.9 + Math.sin(t * 0.18) * stage5 * 0.5
    const y = (compact ? 1.22 : 1.0) + stage2 * 0.55 + Math.cos(t * 0.14) * stage5 * 0.25 + Math.cos(t * 71) * flash * 0.055
    camera.position.set(x + Math.sin(t * 83) * flash * 0.055, y, z)
    camera.lookAt(lookX, lookY, 0)
  })

  return null
}
