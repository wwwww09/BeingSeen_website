import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { shotAngle, shotFigureZ, shotRadius, SHOT_FIGURE_X, SHOT_LOOK_X } from './shotMotion'

/**
 * Camera-only performance for the shot. It starts at the figure's side and
 * arcs to the front while the radius shrinks, so the figure grows without the
 * figure itself turning.
 */
export function ShotCamera({ progress }: { progress: MotionValue<number> }) {
  const { camera, size } = useThree()
  const compact = size.width < 900

  useFrame(() => {
    const t = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const angle = shotAngle(t)
    const radius = shotRadius(t)
    const z = shotFigureZ(t)
    const figureX = compact ? 0 : SHOT_FIGURE_X
    const lookX = compact ? 0.1 : SHOT_LOOK_X
    camera.position.set(
      figureX + Math.sin(angle) * radius,
      1.0,
      z + Math.cos(angle) * radius,
    )
    camera.lookAt(lookX, 1.0, z)
  })

  return null
}
