import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import { useWebGL } from '../lib/useWebGL'
import { Scene } from '../scene/Scene'
import type { TextSide } from '../scene/LensCore'

/**
 * One fixed, full-viewport WebGL canvas behind the whole document.
 *
 * The canvas never scrolls: the text track moves over it, and a MotionValue is
 * handed into the scene so the camera and the lens can respond to scroll
 * without crossing the React render boundary on every frame.
 */
export function Stage({
  progress,
  textSide,
}: {
  progress: MotionValue<number>
  textSide: TextSide
}) {
  const webgl = useWebGL()

  if (webgl !== true) {
    return <div className="stage stage--fallback" aria-hidden="true" />
  }

  return (
    <div className="stage" aria-hidden="true">
      <Canvas
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 42, near: 0.1, far: 80, position: [0, 0, 10] }}
      >
        <Suspense fallback={null}>
          <Scene progress={progress} textSide={textSide} />
        </Suspense>
      </Canvas>
    </div>
  )
}
