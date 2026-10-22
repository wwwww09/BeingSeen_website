import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { MotionValue } from 'framer-motion'
import { HumanFigure } from '../figure/HumanFigure'
import { CrowdField } from './CrowdField'
import { FilmCamera } from './FilmCamera'
import { StarSea } from './StarSea'

export function FilmScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <Canvas
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 60, position: [0.35, 1.02, 4.8] }}
    >
      <color attach="background" args={['#04060b']} />
      <FilmCamera progress={progress} />
      <StarSea progress={progress} />
      <CrowdField progress={progress} />
      <Suspense fallback={null}>
        <HumanFigure mode="film" progress={progress} />
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
