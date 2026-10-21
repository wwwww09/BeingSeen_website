import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { getDotTexture } from './dotTexture'

const EMBER = '#ff5c35'
const IVORY = '#efe9dd'
const COLD = '#8fb7ff'

const ORBIT_COUNT = 900

/** Which half of the screen the text currently occupies. */
export type TextSide = 'left' | 'right'

/**
 * The visual anchor: a dark body, a hot rim, and two thin rings — a lens seen
 * edge-on. It drifts slowly and grows slightly as the page is read.
 */
export function LensCore({
  progress,
  reduced,
  textSide,
}: {
  progress: MotionValue<number>
  reduced: boolean
  textSide: TextSide
}) {
  const group = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Group>(null)
  const orbits = useRef<THREE.Group>(null)

  // On a wide screen the body sits opposite the column of text; on a phone it
  // shrinks and lifts above the title so the type keeps a dark field behind it.
  const width = useThree((state) => state.size.width)
  const compact = width < 900
  const lift = compact ? 1.35 : 0
  const baseScale = compact ? 0.74 : 1
  const restingX = textSide === 'left' ? 1.55 : -1.55

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(ORBIT_COUNT * 3)
    const colors = new Float32Array(ORBIT_COUNT * 3)
    const color = new THREE.Color()

    const palette = [EMBER, IVORY, COLD, IVORY, EMBER]

    for (let i = 0; i < ORBIT_COUNT; i++) {
      const radius = 2.2 + Math.pow(Math.random(), 1.7) * 3.4
      const angle = Math.random() * Math.PI * 2
      const thickness = (Math.random() - 0.5) * (0.18 + Math.random() * 0.35)

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = thickness
      positions[i * 3 + 2] = Math.sin(angle) * radius

      color
        .set(palette[Math.floor(Math.random() * palette.length)])
        .multiplyScalar(0.4 + Math.random() * 0.45)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1)
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)

    if (group.current) {
      if (!reduced) group.current.rotation.y += d * 0.05
      const targetScale = baseScale * (1 + p * 0.16)
      const scale = THREE.MathUtils.damp(group.current.scale.x, targetScale, 3, d)
      group.current.scale.setScalar(scale)

      const targetX = compact ? 0 : restingX
      group.current.position.x = THREE.MathUtils.damp(
        group.current.position.x,
        targetX,
        2.4,
        d,
      )
    }

    if (!reduced && rings.current) {
      rings.current.rotation.z += d * 0.018
      rings.current.rotation.x = Math.PI / 2.2 + p * 0.14
    }

    if (!reduced && orbits.current) {
      orbits.current.rotation.y += d * 0.03
    }
  })

  return (
    <group ref={group} position={[compact ? 0 : restingX, lift, 0]}>
      {/* The body: almost black, with a thin hot shell just outside it. */}
      <mesh>
        <sphereGeometry args={[1.06, 48, 48]} />
        <meshStandardMaterial color="#0a0b0f" roughness={0.32} metalness={0.78} />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[1.06, 32, 32]} />
        <meshBasicMaterial
          color={EMBER}
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={1.45}>
        <sphereGeometry args={[1.06, 24, 24]} />
        <meshBasicMaterial
          color={EMBER}
          transparent
          opacity={0.025}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group ref={rings}>
        <mesh rotation={[Math.PI / 2.2, 0.12, 0]}>
          <torusGeometry args={[1.86, 0.008, 8, 240]} />
          <meshBasicMaterial
            color={EMBER}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.7, -0.32, 0.38]}>
          <torusGeometry args={[2.38, 0.004, 8, 240]} />
          <meshBasicMaterial
            color={IVORY}
            transparent
            opacity={0.26}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2.15, 0.5, 1.15]}>
          <torusGeometry args={[2.06, 0.013, 8, 180, Math.PI * 1.22]} />
          <meshBasicMaterial
            color={EMBER}
            transparent
            opacity={0.55}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      <group ref={orbits}>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[colors, 3]} />
          </bufferGeometry>
          <pointsMaterial
            size={0.036}
            sizeAttenuation
            vertexColors
            map={getDotTexture()}
            transparent
            opacity={0.82}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      </group>
    </group>
  )
}
