import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { getDiskTexture } from './diskTexture'
import { LENS_X, sampleLensPath, type LensKey } from '../lib/lensPath'

const EMBER = '#ff5c35'
const IVORY = '#efe9dd'

/**
 * A black hole, read as a black hole:
 *
 *   - an event horizon with no diffuse shading and no specular highlight
 *   - a thin photon ring around the shadow
 *   - a tilted, glowing accretion disk whose far side is occluded by the body
 *
 * The whole assembly glides continuously between the two halves of the screen
 * along the scroll-derived path in lib/lensPath; there is no side switch.
 */
export function LensCore({
  progress,
  reduced,
  lensKeys,
}: {
  progress: MotionValue<number>
  reduced: boolean
  lensKeys: LensKey[]
}) {
  const group = useRef<THREE.Group>(null)
  const diskSpin = useRef<THREE.Group>(null)
  const haloSpin = useRef<THREE.Group>(null)

  const width = useThree((state) => state.size.width)
  const compact = width < 900
  const lift = compact ? 2.4 : 0
  const baseScale = compact ? 0.56 : 0.78
  const initialX = compact ? 0 : (lensKeys[0]?.x ?? LENS_X)

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1)
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)

    if (group.current) {
      const targetScale = baseScale * (compact ? 1 - p * 0.08 : 1 + p * 0.14)
      group.current.scale.setScalar(
        THREE.MathUtils.damp(group.current.scale.x, targetScale, 2.4, d),
      )

      const targetX = compact ? 0 : sampleLensPath(lensKeys, p)
      group.current.position.x = THREE.MathUtils.damp(
        group.current.position.x,
        targetX,
        1.9,
        d,
      )

      // On a phone the lens is a page-opening ornament: as the reader scrolls
      // it rises out of the frame so long copy never sits behind the shadow.
      if (compact) {
        group.current.position.y = THREE.MathUtils.damp(
          group.current.position.y,
          lift + p * 5.2,
          1.8,
          d,
        )
      }
    }

    if (!reduced && diskSpin.current) {
      diskSpin.current.rotation.z += d * 0.035
    }

    if (!reduced && haloSpin.current) {
      haloSpin.current.rotation.z -= d * 0.012
    }
  })

  return (
    <group ref={group} position={[initialX, lift, 0]}>
      {/* Event horizon. Basic material on purpose: no light means no highlight. */}
      <mesh>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshBasicMaterial color="#010103" toneMapped={false} />
      </mesh>

      {/* A faint hot halo just outside the shadow. */}
      <mesh scale={1.06}>
        <sphereGeometry args={[1.02, 32, 32]} />
        <meshBasicMaterial
          color={EMBER}
          transparent
          opacity={0.055}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[1.02, 24, 24]} />
        <meshBasicMaterial
          color={EMBER}
          transparent
          opacity={0.018}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Photon ring: a thin, nearly white circle around the shadow. */}
      <mesh>
        <torusGeometry args={[1.24, 0.009, 8, 256]} />
        <meshBasicMaterial color={IVORY} toneMapped={false} transparent opacity={0.95} />
      </mesh>
      <mesh>
        <torusGeometry args={[1.29, 0.036, 8, 256]} />
        <meshBasicMaterial
          color={EMBER}
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Accretion disk: a tilted glowing annulus. The body occludes its far side. */}
      <group ref={diskSpin} rotation={[Math.PI / 2 + 0.4, 0.06, 0.08]}>
        <mesh>
          <ringGeometry args={[1.05, 4.4, 160, 1]} />
          <meshBasicMaterial
            map={getDiskTexture()}
            transparent
            opacity={0.88}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/*
        A circular mask at the photon-ring radius. The disk is optically thin and
        passes in front of the shadow; without this the dark region reads as a
        helmet rather than a sphere. The mask is drawn after the disk with depth
        testing off, so the shadow stays a clean circle from every angle.
      */}
      <mesh renderOrder={10}>
        <sphereGeometry args={[1.14, 64, 64]} />
        <meshBasicMaterial
          color="#010103"
          transparent
          opacity={1}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* A second, wider and fainter sheet for volume. */}
      <group ref={haloSpin} rotation={[Math.PI / 2 - 0.52, -0.18, -0.22]}>
        <mesh>
          <ringGeometry args={[1.2, 3.9, 128, 1]} />
          <meshBasicMaterial
            map={getDiskTexture()}
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}
