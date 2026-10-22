import { useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useReducedMotion, type MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { HumanFigure } from './HumanFigure'
import { lerp, smoothstep } from './pose'
import { getDotTexture } from '../scene/dotTexture'

function SequenceCamera({ progress }: { progress: MotionValue<number> }) {
  const { camera } = useThree()
  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1)
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const pull = smoothstep((p - 0.45) / 0.27)
    const sit = smoothstep((p - 0.55) / 0.35)

    const targetZ = 4.2 + pull * 1.0
    const targetY = lerp(1.02, 0.72, sit)

    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3.2, d)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.2, d)
    const targetX = lerp(0.55, 0.2, sit)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.2, d)
    camera.lookAt(0.1, lerp(0.95, 0.62, sit), 0.2)
  })
  return null
}

/** A small local dust shell, sized for the figure's camera distance. */
function Dust({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { positions, colors } = useMemo(() => {
    const count = 750
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const radius = 2.4 + Math.random() * 6.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = 0.8 + radius * Math.cos(phi) * 0.55
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      color
        .set(Math.random() < 0.78 ? '#b9c8ff' : '#efe9df')
        .multiplyScalar(0.35 + Math.random() * 0.45)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    return { positions, colors }
  }, [])

  useFrame((_, delta) => {
    if (!reduced && group.current) group.current.rotation.y += Math.min(delta, 0.1) * 0.012
  })

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          sizeAttenuation
          vertexColors
          map={getDotTexture()}
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

export function FigureCanvas({ progress }: { progress: MotionValue<number> }) {
  const reduced = useReducedMotion() ?? false

  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 40, position: [0, 1.02, 4.2] }}
    >
      <color attach="background" args={['#04060b']} />
      <fog attach="fog" args={['#04060b', 7, 22]} />
      <SequenceCamera progress={progress} />

      <Dust reduced={reduced} />
      <HumanFigure progress={progress} />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={1.25}
          luminanceThreshold={0.22}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  )
}
