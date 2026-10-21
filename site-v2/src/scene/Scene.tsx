import { useReducedMotion, type MotionValue } from 'framer-motion'
import { CameraRig } from './CameraRig'
import { LensCore, type TextSide } from './LensCore'
import { Starfield } from './Starfield'

export function Scene({
  progress,
  textSide,
}: {
  progress: MotionValue<number>
  textSide: TextSide
}) {
  const reduced = useReducedMotion() ?? false

  return (
    <>
      <color attach="background" args={['#07080a']} />
      <fog attach="fog" args={['#07080a', 16, 46]} />

      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 5]} intensity={1.4} color="#ffd9c2" />
      <directionalLight position={[-6, -2, -4]} intensity={0.5} color="#8fb7ff" />

      <Starfield reduced={reduced} />
      <LensCore progress={progress} reduced={reduced} textSide={textSide} />
      <CameraRig progress={progress} reduced={reduced} />
    </>
  )
}
