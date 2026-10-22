import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { MotionValue } from 'framer-motion'
import { HumanFigure } from '../figure/HumanFigure'
import { StarSea } from '../film/StarSea'
import { ShotCamera } from './ShotCamera'
import { SHOT_FIGURE_X, SHOT_START_RADIUS } from './shotMotion'

export function ShotScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [SHOT_FIGURE_X + SHOT_START_RADIUS, 1.0, -1.4] }}
    >
      <color attach="background" args={['#04060b']} />
      <ShotCamera progress={progress} />
      <StarSea progress={progress} />
      <Suspense fallback={null}>
        <HumanFigure mode="shot" progress={progress} />
      </Suspense>
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.9}
          luminanceThreshold={0.28}
          luminanceSmoothing={0.3}
          mipmapBlur
          radius={0.6}
        />
      </EffectComposer>
    </Canvas>
  )
}
