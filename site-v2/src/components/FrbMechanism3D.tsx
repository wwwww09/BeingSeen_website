import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, Stars } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getDotTexture } from '../scene/dotTexture'

/**
 * The FRB lensing diagram.
 *
 * Source on the right, lensing galaxy at the centre, Earth on the left.
 * The blue dashed line is the straight (unlensed) path; the red curve is the
 * bent path that arrives later. Small pulses travel both paths so the two
 * arrivals are visible without turning the diagram into an animation.
 */

const EARTH_X = -5.6
const SOURCE_X = 5.6

const DIRECT_CURVE = new THREE.LineCurve3(
  new THREE.Vector3(SOURCE_X, 0, 0),
  new THREE.Vector3(EARTH_X, 0, 0),
)

const DELAYED_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(SOURCE_X, 0, 0),
  new THREE.Vector3(3.55, 1.75, 0.22),
  new THREE.Vector3(1.4, 3.0, 0.3),
  new THREE.Vector3(-1.4, 3.0, 0.3),
  new THREE.Vector3(-3.55, 1.75, 0.22),
  new THREE.Vector3(EARTH_X, 0, 0),
])

const DELAYED_POINTS = DELAYED_CURVE.getPoints(96)

let earthTexture: THREE.Texture | null = null

/** A small procedural Earth: blue ocean, green land, pale ice caps. */
function getEarthTexture(): THREE.Texture {
  if (earthTexture) return earthTexture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size / 2

  const context = canvas.getContext('2d')
  if (!context) return new THREE.Texture()

  const ocean = context.createLinearGradient(0, 0, 0, canvas.height)
  ocean.addColorStop(0, '#0d2b46')
  ocean.addColorStop(0.5, '#17476a')
  ocean.addColorStop(1, '#0b243a')
  context.fillStyle = ocean
  context.fillRect(0, 0, canvas.width, canvas.height)

  const land: Array<[number, number, number, number, number]> = [
    [42, 78, 34, 20, 0.3],
    [80, 94, 22, 15, -0.2],
    [135, 70, 26, 18, 0.5],
    [160, 108, 18, 24, 0.1],
    [215, 62, 38, 17, -0.3],
    [260, 88, 24, 12, 0.2],
    [305, 118, 20, 26, -0.4],
    [350, 66, 30, 16, 0.2],
    [405, 96, 22, 18, 0.1],
    [448, 74, 18, 12, -0.3],
    [120, 142, 26, 12, 0.2],
    [235, 156, 34, 10, -0.1],
    [370, 150, 24, 9, 0.3],
  ]

  land.forEach(([x, y, rx, ry, rotation]) => {
    context.beginPath()
    context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2)
    context.fillStyle = 'rgba(66, 166, 112, 0.92)'
    context.fill()
  })

  // Ice caps
  context.fillStyle = 'rgba(226, 242, 252, 0.78)'
  context.fillRect(0, 0, canvas.width, 9)
  context.fillRect(0, canvas.height - 9, canvas.width, 9)

  // Very faint cloud bands
  context.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  context.lineWidth = 2
  for (let i = 0; i < 7; i += 1) {
    const y = 26 + i * 28
    context.beginPath()
    context.moveTo(0, y)
    context.bezierCurveTo(140, y - 8, 340, y + 8, canvas.width, y)
    context.stroke()
  }

  earthTexture = new THREE.CanvasTexture(canvas)
  earthTexture.colorSpace = THREE.SRGBColorSpace
  earthTexture.needsUpdate = true
  return earthTexture
}

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const portrait = width / Math.max(height, 1) < 1
    camera.position.set(0, portrait ? 1.9 : 1.4, portrait ? 21 : 16)
    camera.fov = portrait ? 48 : 38
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

function Source() {
  const sprite = useMemo(() => getDotTexture(), [])

  return (
    <group position={[SOURCE_X, 0, 0]}>
      <mesh>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshBasicMaterial color="#ffe27a" />
      </mesh>
      <sprite scale={[2.4, 2.4, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffd54a"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function Galaxy({ animate }: { animate: boolean }) {
  const inner = useRef<THREE.Mesh>(null)
  const outer = useRef<THREE.Mesh>(null)
  const sprite = useMemo(() => getDotTexture(), [])

  useFrame(({ clock }) => {
    if (!animate) return
    if (inner.current) inner.current.rotation.z = clock.elapsedTime * 0.12
    if (outer.current) outer.current.rotation.z = -clock.elapsedTime * 0.07
  })

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.15, 48, 48]} />
        <meshStandardMaterial
          color="#c9963f"
          emissive="#6b4a14"
          emissiveIntensity={0.7}
          metalness={0.35}
          roughness={0.55}
        />
      </mesh>

      <sprite scale={[5.2, 5.2, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffcf8b"
          transparent
          opacity={0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <mesh ref={inner}>
        <torusGeometry args={[1.58, 0.018, 8, 96]} />
        <meshBasicMaterial
          color="#ffcf8b"
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={outer}>
        <torusGeometry args={[1.92, 0.012, 8, 96]} />
        <meshBasicMaterial
          color="#ffcf8b"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

function Earth({ animate }: { animate: boolean }) {
  const globe = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => getEarthTexture(), [])
  const sprite = useMemo(() => getDotTexture(), [])

  useFrame(({ clock }) => {
    if (!animate || !globe.current) return
    globe.current.rotation.y = clock.elapsedTime * 0.08
  })

  return (
    <group position={[EARTH_X, 0, 0]}>
      <mesh ref={globe}>
        <sphereGeometry args={[0.9, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.62}
          metalness={0.08}
          emissive="#0a2a44"
          emissiveIntensity={0.55}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.98, 32, 32]} />
        <meshBasicMaterial
          color="#4fa9ff"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <sprite scale={[2.8, 2.8, 1]}>
        <spriteMaterial
          map={sprite}
          color="#4fa9ff"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function SignalPulse({
  curve,
  period,
  offset,
  animate,
}: {
  curve: THREE.Curve<THREE.Vector3>
  period: number
  offset: number
  animate: boolean
}) {
  const pulse = useRef<THREE.Group>(null)
  const sprite = useMemo(() => getDotTexture(), [])

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const raw = clock.elapsedTime - offset
    const t = animate
      ? (((raw % period) + period) % period) / period
      : 0.62
    const point = curve.getPointAt(Math.min(1, Math.max(0, t)))
    pulse.current.position.copy(point)
    const scale = animate ? 0.85 + Math.sin(t * Math.PI) * 0.35 : 1
    pulse.current.scale.setScalar(scale)
  })

  return (
    <group ref={pulse}>
      <mesh>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial color="#ffe27a" />
      </mesh>
      <sprite scale={[0.9, 0.9, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffe27a"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function SceneContent({ animate }: { animate: boolean }) {
  const scene = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!animate || !scene.current) return
    const t = clock.elapsedTime
    scene.current.rotation.y = Math.sin(t * 0.14) * 0.07
    scene.current.rotation.x = Math.sin(t * 0.1) * 0.022
  })

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 6, 8]} intensity={2.2} color="#fff3df" />
      <pointLight position={[-5, 2, 3]} intensity={2.4} color="#4fa9ff" distance={14} />
      <pointLight position={[5, 0, 3]} intensity={1.8} color="#ffd54a" distance={10} />

      <Stars
        radius={70}
        depth={34}
        count={650}
        factor={2.4}
        saturation={0}
        fade
        speed={animate ? 0.16 : 0}
      />

      <group ref={scene}>
        <Earth animate={animate} />
        <Galaxy animate={animate} />
        <Source />

        {/* direct, unlensed path */}
        <Line
          points={[
            [SOURCE_X, 0, 0],
            [EARTH_X, 0, 0],
          ]}
          color="#7fb9ff"
          lineWidth={1.7}
          dashed
          dashSize={0.3}
          gapSize={0.2}
          transparent
          opacity={0.85}
        />

        {/* bent path, delayed by the lens */}
        <Line
          points={DELAYED_POINTS}
          color="#ff5c35"
          lineWidth={2.5}
          transparent
          opacity={0.95}
        />

        <SignalPulse
          curve={DIRECT_CURVE}
          period={3.8}
          offset={0}
          animate={animate}
        />
        <SignalPulse
          curve={DELAYED_CURVE}
          period={4.8}
          offset={0.8}
          animate={animate}
        />
      </group>
    </>
  )
}

export function FrbMechanism3D({ animate = true }: { animate?: boolean }) {
  return (
    <div className="frb-scene__canvas">
      <Canvas
        camera={{ position: [0, 1.4, 16], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ResponsiveCamera />
        <SceneContent animate={animate} />
      </Canvas>
    </div>
  )
}
