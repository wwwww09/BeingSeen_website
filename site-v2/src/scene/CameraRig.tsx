import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'

/**
 * Scroll is the only camera control: a slow dolly-in and a small lateral drift.
 * Damping is done against real frame time, so a fast flick still settles
 * smoothly instead of snapping.
 */
export function CameraRig({
  progress,
  reduced,
}: {
  progress: MotionValue<number>
  reduced: boolean
}) {
  const { camera, size } = useThree()
  const compact = size.width < 900

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1)
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)

    const baseZ = compact ? 12.2 : 10
    const targetZ = baseZ - (reduced ? 0.8 : 3.1) * p
    const targetY = (reduced ? 0.1 : 0.5) * (1 - p) - 0.18 * p
    const targetX = reduced ? 0 : Math.sin(p * Math.PI) * 0.32

    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3.2, d)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.2, d)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.2, d)
    camera.lookAt(0, 0, 0)
  })

  return null
}
