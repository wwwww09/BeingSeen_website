import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'

/**
 * The camera has two motions at once:
 *
 *   1. a scroll-driven dolly (and a small lateral drift), damped against real
 *      frame time, so a fast flick settles instead of snapping;
 *   2. a very slow free orbit around the black hole, so the frame is never
 *      completely static even when the page is still.
 *
 * The orbit is what keeps the scene alive between chapters. The lens itself
 * glides along the scroll path; the camera does not switch sides.
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

  useFrame((state, delta) => {
    const d = Math.min(delta, 0.1)
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const time = state.clock.elapsedTime

    const baseZ = compact ? 13.2 : 11.2
    const targetZ = baseZ - (reduced ? 0.6 : 2.1) * p
    const targetY = (reduced ? 0.1 : 0.5) * (1 - p) - 0.18 * p
    const targetX = reduced ? 0 : Math.sin(p * Math.PI) * 0.32

    const orbitX = reduced ? 0 : Math.sin(time * 0.055) * 0.55
    const orbitY = reduced ? 0 : Math.cos(time * 0.045) * 0.18
    const breathe = reduced ? 0 : Math.cos(time * 0.05) * 0.12

    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      targetZ + breathe,
      3.2,
      d,
    )
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      targetY + orbitY,
      2.6,
      d,
    )
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      targetX + orbitX,
      2.6,
      d,
    )
    camera.lookAt(0, 0, 0)
  })

  return null
}
