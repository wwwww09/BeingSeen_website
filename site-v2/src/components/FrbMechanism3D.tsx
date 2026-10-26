import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls, Stars } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getDotTexture } from '../scene/dotTexture'

/**
 * FRB lensing, as a floating WebGL scene.
 *
 * There is no panel or texture here: the Canvas clears to transparent, the
 * page's black background shows through, and a faint three-dimensional
 * starfield supplies the only background. Earth and the lensing galaxy are
 * abstract glowing spheres; the paths are screen-space lines.
 */

const EARTH_POS: [number, number, number] = [-6, 0, 0]
const SOURCE_POS: [number, number, number] = [6, 0, 0]
const EARTH_END: [number, number, number] = [-5.38, 0, 0]

const DIRECT_CURVE = new THREE.LineCurve3(
  new THREE.Vector3(...SOURCE_POS),
  new THREE.Vector3(...EARTH_END),
)

const DELAYED_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(...SOURCE_POS),
  new THREE.Vector3(4.1, 1.8, 0),
  new THREE.Vector3(1.6, 3.3, 0),
  new THREE.Vector3(-1.6, 3.3, 0),
  new THREE.Vector3(-4.1, 1.8, 0),
  new THREE.Vector3(...EARTH_END),
])

const DELAYED_POINTS = DELAYED_CURVE.getPoints(128)

const RIM_VERTEX = `
  varying vec3 vNormalView;
  varying vec3 vViewDirection;

  void main() {
    vNormalView = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const RIM_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormalView;
  varying vec3 vViewDirection;

  void main() {
    float rim = pow(1.0 - max(dot(vNormalView, vViewDirection), 0.0), 2.2);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`

function GlowShell({
  radius,
  color,
  intensity = 1,
}: {
  radius: number
  color: string
  intensity?: number
}) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        uniforms={{
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: intensity },
        }}
        vertexShader={RIM_VERTEX}
        fragmentShader={RIM_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const portrait = width / Math.max(height, 1) < 1
    camera.position.set(0, portrait ? 1.5 : 1.2, portrait ? 22 : 17)
    camera.fov = portrait ? 50 : 40
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

function Earth({ animate }: { animate: boolean }) {
  const halo = useRef<THREE.Sprite>(null)
  const sprite = useMemo(() => getDotTexture(), [])

  useFrame(({ clock }) => {
    if (!animate || !halo.current) return
    const scale = 2.2 + Math.sin(clock.elapsedTime * 1.1) * 0.03
    halo.current.scale.set(scale, scale, 1)
  })

  return (
    <group position={EARTH_POS}>
      <mesh>
        <sphereGeometry args={[0.62, 48, 48]} />
        <meshStandardMaterial
          color="#0a192f"
          emissive="#0b2a4a"
          emissiveIntensity={0.45}
          roughness={0.55}
          metalness={0.1}
        />
      </mesh>
      {/* Faint atmospheric rim only: the sphere stays midnight blue. */}
      <GlowShell radius={0.7} color="#2f6f9f" intensity={0.3} />
      <GlowShell radius={0.95} color="#244f77" intensity={0.11} />
      <sprite ref={halo} scale={[2.2, 2.2, 1]}>
        <spriteMaterial
          map={sprite}
          color="#2f7fbf"
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function ringPoints(radius: number, segments = 128): [number, number, number][] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2
    return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0] as [
      number,
      number,
      number,
    ]
  })
}

const LENS_RINGS = [1.1, 1.35, 1.6, 1.85].map((radius, index) => ({
  radius,
  points: ringPoints(radius),
  opacity: [0.22, 0.16, 0.11, 0.07][index],
}))

function Galaxy({ animate }: { animate: boolean }) {
  const field = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!animate || !field.current) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 0.45) * 0.025
    field.current.scale.setScalar(pulse)
    field.current.rotation.z = clock.elapsedTime * 0.02
  })

  return (
    <group ref={field} position={[0, 0, 0]}>
      {/* The lensing galaxy: a translucent amber sphere, not a flat target. */}
      <mesh position={[0, 0, 0]} renderOrder={1}>
        <sphereGeometry args={[1.02, 64, 64]} />
        <meshStandardMaterial
          color="#d97706"
          emissive="#b45309"
          emissiveIntensity={0.5}
          transparent
          opacity={0.1}
          roughness={0.45}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>
      <GlowShell radius={1.12} color="#d97706" intensity={0.28} />

      {/* Faint lensing rings, tilted so they read as a halo in depth. */}
      <group rotation={[0.42, 0.18, 0]}>
        {LENS_RINGS.map((ring) => (
          <Line
            key={ring.radius}
            points={ring.points}
            color="#e3a54a"
            lineWidth={0.8}
            transparent
            opacity={ring.opacity * 1.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        ))}
      </group>
    </group>
  )
}

function Source() {
  const sprite = useMemo(() => getDotTexture(), [])

  return (
    <group position={SOURCE_POS}>
      <mesh>
        <sphereGeometry args={[0.16, 24, 24]} />
        <meshBasicMaterial color="#ffe27a" />
      </mesh>
      <sprite scale={[2.0, 2.0, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffd54a"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function SignalPulse({
  curve,
  color,
  period,
  duration,
  animate,
}: {
  curve: THREE.Curve<THREE.Vector3>
  color: string
  period: number
  duration: number
  animate: boolean
}) {
  const pulse = useRef<THREE.Group>(null)
  const sprite = useMemo(() => getDotTexture(), [])

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const elapsed = clock.elapsedTime % period
    const t = animate ? Math.min(1, elapsed / duration) : 0.55
    const point = curve.getPointAt(t)
    pulse.current.position.copy(point)
    const scale = animate ? 0.85 + Math.sin(t * Math.PI) * 0.25 : 1
    pulse.current.scale.setScalar(scale)
  })

  return (
    <group ref={pulse}>
      <mesh renderOrder={20}>
        <sphereGeometry args={[0.11, 16, 16]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
      <sprite scale={[1.0, 1.0, 1]} renderOrder={21}>
        <spriteMaterial
          map={sprite}
          color={color}
          transparent
          opacity={0.7}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function Scene({ animate }: { animate: boolean }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 5, 6]} intensity={1.2} color="#fff3df" />
      <pointLight position={[-5, 1, 4]} intensity={1.0} color="#2f6f9f" distance={12} />
      <pointLight position={[0, 0, 4]} intensity={1.0} color="#b8893f" distance={10} />

      <Stars
        radius={80}
        depth={50}
        count={900}
        factor={1.25}
        saturation={0}
        fade
        speed={animate ? 0.12 : 0}
      />

      <Earth animate={animate} />
      <Galaxy animate={animate} />
      <Source />

      {/* direct, unlensed path — deliberately faint */}
      <Line
        points={[SOURCE_POS, EARTH_END]}
        color="#bcd7f5"
        lineWidth={0.8}
        transparent
        opacity={0.36}
        depthWrite={false}
      />

      {/* lensed path: a wide, low-opacity glow under a bright gold core */}
      <Line
        points={DELAYED_POINTS}
        color="#8a5f2a"
        lineWidth={4.5}
        transparent
        opacity={0.1}
        depthWrite={false}
      />
      <Line
        points={DELAYED_POINTS}
        color="#b8893f"
        lineWidth={1.8}
        transparent
        opacity={0.65}
        depthWrite={false}
      />

      <SignalPulse
        curve={DIRECT_CURVE}
        color="#e8f2ff"
        period={6}
        duration={1.4}
        animate={animate}
      />
      <SignalPulse
        curve={DELAYED_CURVE}
        color="#d8a85a"
        period={6}
        duration={5.2}
        animate={animate}
      />
    </>
  )
}

export function FrbMechanism3D({ animate = true }: { animate?: boolean }) {
  return (
    <div className="frb-scene__canvas">
      <Canvas
        camera={{ position: [0, 1.2, 17], fov: 40 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ResponsiveCamera />
        <Scene animate={animate} />
        <OrbitControls
          makeDefault
          target={[0, 0, 0]}
          enablePan={false}
          enableZoom={false}
          autoRotate={animate}
          autoRotateSpeed={0.55}
          rotateSpeed={0.42}
          enableDamping
          dampingFactor={0.07}
          minPolarAngle={Math.PI / 2 - 0.35}
          maxPolarAngle={Math.PI / 2 + 0.35}
        />
      </Canvas>
    </div>
  )
}
