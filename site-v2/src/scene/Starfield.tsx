import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getDotTexture } from './dotTexture'

const COUNT = 2200
const WARM = new THREE.Color('#efe9dd')
const COLD = new THREE.Color('#8fb7ff')

/** A slow shell of distant stars around the lens. */
export function Starfield({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null)

  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const colors = new Float32Array(COUNT * 3)
    const color = new THREE.Color()

    for (let i = 0; i < COUNT; i++) {
      const radius = 16 + Math.random() * 24
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      color
        .copy(Math.random() < 0.84 ? WARM : COLD)
        .multiplyScalar(0.45 + Math.random() * 0.55)

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    if (!reduced && group.current) {
      group.current.rotation.y += Math.min(delta, 0.1) * 0.006
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
          size={0.07}
          sizeAttenuation
          vertexColors
          map={getDotTexture()}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}
