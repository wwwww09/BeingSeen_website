import { useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useReducedMotion, type MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { HumanFigure } from './HumanFigure'
import { getDotTexture } from '../scene/dotTexture'

function CameraSetup() {
  const { camera } = useThree()
  useLayoutEffect(() => {
    camera.lookAt(0, 0.98, 0)
  }, [camera])
  return null
}

/** A small local dust shell, sized for the figure's camera distance. */
function Dust({ reduced }: { reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const { positions, colors } = useMemo(() => {
    const count = 900
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const color = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const radius = 2.2 + Math.random() * 5.5
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = 0.6 + radius * Math.cos(phi) * 0.55
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      color
        .set(Math.random() < 0.8 ? '#9fc4ff' : '#efe9dd')
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
          size={0.028}
          sizeAttenuation
          vertexColors
          map={getDotTexture()}
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

export function FigureCanvas({
  collapse,
  running,
}: {
  collapse: MotionValue<number>
  running: boolean
}) {
  const reduced = useReducedMotion() ?? false

  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 40, position: [0, 1.0, 3.6] }}
    >
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#05070c', 5, 18]} />
      <CameraSetup />

      <ambientLight intensity={0.4} color="#5a7bb5" />
      <directionalLight position={[3, 4, 4]} intensity={1.15} color="#bcd6ff" />
      <directionalLight position={[-4, 2, -3]} intensity={4.0} color="#ffb27a" />
      <pointLight position={[0, 0.8, 2.4]} intensity={0.7} color="#6f8dff" />

      <Dust reduced={reduced} />
      <HumanFigure collapse={collapse} running={running} />
    </Canvas>
  )
}
