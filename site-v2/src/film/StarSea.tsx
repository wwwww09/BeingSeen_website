import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { smoothstep } from '../figure/pose'
import { getDotTexture } from '../scene/dotTexture'

/** The quiet star field that survives after the crowd dissolves. */
export function StarSea({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  const material = useRef<THREE.PointsMaterial>(null)

  const { positions, colors } = useMemo(() => {
    const count = 6_500
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      const radius = 9 + Math.random() * 22
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = 0.8 + radius * Math.cos(phi) * 0.6
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      color
        .set(Math.random() < 0.12 ? '#ffd7a3' : Math.random() < 0.55 ? '#c9d6ff' : '#efe9df')
        .multiplyScalar(0.25 + Math.random() * 0.45)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const d = Math.min(delta, 0.1)
    if (group.current) {
      group.current.rotation.y += d * 0.005
      group.current.rotation.x = Math.sin(p * Math.PI) * 0.03
    }
    if (material.current) {
      material.current.opacity = 0.22 + 0.7 * smoothstep((p - 0.62) / 0.26)
    }
  })

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={material}
          size={0.045}
          sizeAttenuation
          vertexColors
          map={getDotTexture()}
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
