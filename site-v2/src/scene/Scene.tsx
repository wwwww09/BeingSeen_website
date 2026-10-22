import { useReducedMotion, type MotionValue } from 'framer-motion'
import { CameraRig } from './CameraRig'
import type { LensKey } from '../lib/lensPath'
import { LensCore } from './LensCore'
import { Starfield } from './Starfield'

export function Scene({
  progress,
  lensKeys,
}: {
  progress: MotionValue<number>
  lensKeys: LensKey[]
}) {
  const reduced = useReducedMotion() ?? false

  return (
    <>
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 16, 46]} />

      <Starfield reduced={reduced} />
      <LensCore progress={progress} reduced={reduced} lensKeys={lensKeys} />
      <CameraRig progress={progress} reduced={reduced} />
    </>
  )
}
