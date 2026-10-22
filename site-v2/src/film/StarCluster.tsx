import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { smoothstep } from '../figure/pose'
import { getDotTexture } from '../scene/dotTexture'

function getClusterGlow(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,248,228,0.8)')
  g.addColorStop(0.15, 'rgba(201,214,255,0.35)')
  g.addColorStop(0.5, 'rgba(120,150,255,0.08)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * A globular cluster, not just a flat star field: a dense core, a halo, and
 * a few bright members. It takes over as the crowd loses its human outlines.
 */
export function StarCluster({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  const compact = useThree((state) => state.size.width < 900)
  const material = useRef<THREE.PointsMaterial>(null)
  const glowMaterial = useRef<THREE.SpriteMaterial>(null)
  const glowTexture = useMemo(() => getClusterGlow(), [])

  const { positions, colors } = useMemo(() => {
    const count = 14_000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()

    for (let i = 0; i < count; i++) {
      // A King-like concentration: most stars crowd into the core.
      const radius = 3.6 * Math.pow(Math.random(), 2.35)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const flatten = 0.78
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi) * flatten
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      color
        .set(
          Math.random() < 0.1
            ? '#ffd7a3'
            : Math.random() < 0.55
              ? '#c9d6ff'
              : '#efe9df',
        )
        .multiplyScalar(0.28 + Math.random() * 0.5)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const appear = smoothstep((p - 0.72) / 0.12)
    const d = Math.min(delta, 0.1)

    if (group.current) {
      group.current.visible = appear > 0.01
      group.current.rotation.y += d * 0.018
      group.current.rotation.z = Math.sin(p * 5) * 0.03
    }
    if (material.current) material.current.opacity = appear * 0.9
    if (glowMaterial.current) glowMaterial.current.opacity = appear * 0.22
  })

  return (
    <group ref={group} position={[compact ? 0 : 1.6, 1.1, -3.2]} visible={false}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={material}
          size={0.055}
          sizeAttenuation
          vertexColors
          map={getDotTexture()}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <sprite scale={[7.5, 7.5, 1]}>
        <spriteMaterial
          ref={glowMaterial}
          map={glowTexture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  )
}
