import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { lerp, smoothstep } from '../figure/pose'

/**
 * A single continuous move across the whole film:
 * close on the runner, pull back as he folds, slide sideways for the
 * magnetar, then keep pulling until the crowd is only a field of stars.
 */
export function FilmCamera({ progress }: { progress: MotionValue<number> }) {
  const { camera, size } = useThree()
  const compact = size.width < 900

  useFrame((_, delta) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const d = Math.min(delta, 0.1)

    const fold = smoothstep((p - 0.15) / 0.15)
    const magnetar = smoothstep((p - 0.32) / 0.1)
    const crowd = smoothstep((p - 0.54) / 0.16)
    const stars = smoothstep((p - 0.74) / 0.14)

    const targetZ = 4.8 + fold * 1.2 + crowd * 5.4 + stars * 7.0
    const targetX = 0.35 + magnetar * 0.7 + crowd * 0.3
    const targetY = 1.02 - fold * 0.2 + crowd * 0.35 + stars * 0.55

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.0, d)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.0, d)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 2.6, d)

    const lookY = lerp(0.95, 0.78, fold) + crowd * 0.12 + stars * 0.18 + (compact ? 0.6 : 0)
    const lookX = compact ? 0.1 : 0.55
    camera.lookAt(lookX, lookY, 0.2)
  })

  return null
}
