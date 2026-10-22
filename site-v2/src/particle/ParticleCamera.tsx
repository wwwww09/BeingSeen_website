import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smooth = (value: number) => {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

export function ParticleCamera({ progress }: { progress: MotionValue<number> }) {
  const { camera, size } = useThree()
  const compact = size.width < 900

  useFrame((state) => {
    const p = clamp01(progress.get())
    const t = state.clock.elapsedTime
    const intro = smooth(p / 0.2)
    const orbit = smooth((p - 0.2) / 0.2) * 0.55
    const pull = smooth((p - 0.5) / 0.1)
    const zoomOut = smooth((p - 0.6) / 0.2)
    const flash = Math.exp(-Math.pow((p - 0.5) / 0.019, 2))

    const groupX = compact ? 0 : 0.7
    const lookX = compact ? 0.1 : 0.2
    const lookY = compact ? 1.5 : 1.0
    const z = 4.4 + 0.8 * intro + 0.8 * pull + 5.6 * zoomOut
    const x = groupX + Math.sin(orbit) * 0.9
    const y = (compact ? 1.22 : 1.0) + Math.cos(t * 71) * flash * 0.055
    camera.position.set(x + Math.sin(t * 83) * flash * 0.055, y, z)
    camera.lookAt(lookX, lookY, 0)
  })

  return null
}
