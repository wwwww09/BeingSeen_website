import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { MotionValue } from 'framer-motion'
import { ParticleCloud } from './ParticleCloud'
import { ParticleCamera } from './ParticleCamera'

export function ParticleScene({
  progress,
  intro,
}: {
  progress: MotionValue<number>
  intro?: MotionValue<number>
}) {
  return (
    <Canvas
      dpr={[1, 1.7]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 80, position: [0.7, 1.0, 5] }}
    >
      <color attach="background" args={['#03050a']} />
      <ParticleCloud progress={progress} intro={intro} />
      <ParticleCamera progress={progress} intro={intro} />
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.95}
          luminanceThreshold={0.22}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.7}
        />
      </EffectComposer>
    </Canvas>
  )
}
