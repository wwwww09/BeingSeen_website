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

const EARTH_POS: [number, number, number] = [-5.6, 0, 0.5]
const SOURCE_POS: [number, number, number] = [5.6, 0, -0.5]

const DELAYED_CURVE = new THREE.CatmullRomCurve3([
  new THREE.Vector3(...SOURCE_POS),
  new THREE.Vector3(3.8, 1.9, 0.2),
  new THREE.Vector3(1.5, 3.4, 0.8),
  new THREE.Vector3(-1.5, 3.4, 0.8),
  new THREE.Vector3(-3.8, 1.9, 0.2),
  new THREE.Vector3(...EARTH_POS),
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
    camera.position.set(0, portrait ? 1.5 : 1.2, portrait ? 21 : 17)
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
    const scale = 2.4 + Math.sin(clock.elapsedTime * 1.1) * 0.06
    halo.current.scale.set(scale, scale, 1)
  })

  return (
    <group position={EARTH_POS}>
      <mesh>
        <sphereGeometry args={[0.62, 48, 48]} />
        <meshStandardMaterial
          color="#1a6f9e"
          emissive="#08324f"
          emissiveIntensity={0.7}
          roughness={0.55}
          metalness={0.1}
        />
      </mesh>
      <GlowShell radius={0.68} color="#3f9dff" intensity={0.55} />
      <sprite ref={halo} scale={[2.4, 2.4, 1]}>
        <spriteMaterial
          map={sprite}
          color="#4fa9ff"
          transparent
          opacity={0.26}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function Galaxy() {
  const sprite = useMemo(() => getDotTexture(), [])

  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.95, 48, 48]} />
        <meshStandardMaterial
          color="#d9a24c"
          emissive="#7a4f12"
          emissiveIntensity={0.55}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
      <GlowShell radius={1.06} color="#ffcf8b" intensity={0.55} />
      <sprite scale={[5.2, 5.2, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffcf8b"
          transparent
          opacity={0.28}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      {/* a tilted ring gives the galaxy its depth */}
      <mesh rotation={[Math.PI / 2.35, 0.35, 0.15]}>
        <torusGeometry args={[1.55, 0.018, 12, 128]} />
        <meshBasicMaterial
          color="#ffcf8b"
          transparent
          opacity={0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, -0.25, 0.1]}>
        <torusGeometry args={[1.9, 0.012, 8, 128]} />
        <meshBasicMaterial
          color="#ffcf8b"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
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
      <sprite scale={[2.2, 2.2, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffd54a"
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function SignalPulse({ animate }: { animate: boolean }) {
  const pulse = useRef<THREE.Group>(null)
  const sprite = useMemo(() => getDotTexture(), [])

  useFrame(({ clock }) => {
    if (!pulse.current) return
    const t = animate ? (clock.elapsedTime % 5.2) / 5.2 : 0.58
    const point = DELAYED_CURVE.getPointAt(t)
    pulse.current.position.copy(point)
    const scale = animate ? 0.85 + Math.sin(t * Math.PI) * 0.35 : 1
    pulse.current.scale.setScalar(scale)
  })

  return (
    <group ref={pulse}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ffe8c4" />
      </mesh>
      <sprite scale={[1.1, 1.1, 1]}>
        <spriteMaterial
          map={sprite}
          color="#ffcf8b"
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function Scene({ animate }: { animate: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[-4, 5, 6]} intensity={2.2} color="#fff3df" />
      <pointLight position={[-5, 1, 4]} intensity={3} color="#4fa9ff" distance={12} />
      <pointLight position={[0, 0, 4]} intensity={2.4} color="#ffcf8b" distance={10} />

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
      <Galaxy />
      <Source />

      {/* direct, unlensed path — deliberately faint */}
      <Line
        points={[SOURCE_POS, EARTH_POS]}
        color="#cfe4ff"
        lineWidth={1}
        transparent
        opacity={0.4}
        depthWrite={false}
      />

      {/* lensed path: a wide, low-opacity glow under a bright gold core */}
      <Line
        points={DELAYED_POINTS}
        color="#ff9d3d"
        lineWidth={7}
        transparent
        opacity={0.14}
        depthWrite={false}
      />
      <Line
        points={DELAYED_POINTS}
        color="#f5b85a"
        lineWidth={2.4}
        transparent
        opacity={0.96}
        depthWrite={false}
      />

      <SignalPulse animate={animate} />
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
