import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Html, Line, Stars } from '@react-three/drei'
import { useInView } from 'framer-motion'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { getDotTexture } from '../scene/dotTexture'
import type { ReactNode, RefObject } from 'react'

/**
 * FRB lensing geometry, kept deliberately flat on the z = 0 plane.
 *
 *   Earth (observer)  x = 0
 *   Lensing galaxy    x = 2
 *   FRB source        x = 6
 *
 * A straight dashed blue path goes directly to the observer. A curved gold
 * path bends above the galaxy with a peak at y = 1.2. The two moving pulses
 * start together at the source and arrive at different times.
 */

const EARTH_POS: [number, number, number] = [0, 0, 0]
const GALAXY_POS: [number, number, number] = [2, 0, 0]
const SOURCE_POS: [number, number, number] = [6, 0, 0]

const EARTH_RADIUS = 0.36
const GALAXY_RADIUS = 0.46
const SOURCE_RADIUS = 0.2

const PATH_START = new THREE.Vector3(SOURCE_POS[0] - SOURCE_RADIUS - 0.04, 0, 0)
const PATH_END = new THREE.Vector3(EARTH_POS[0] + EARTH_RADIUS + 0.02, 0, 0)
const DIRECT_CURVE = new THREE.LineCurve3(PATH_START, PATH_END)
const DELAYED_CURVE = new THREE.QuadraticBezierCurve3(
  PATH_START,
  new THREE.Vector3(3, 2.4, 0),
  PATH_END,
)
const DELAYED_POINTS = DELAYED_CURVE.getPoints(160)

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
    float rim = pow(1.0 - max(dot(vNormalView, vViewDirection), 0.0), 2.4);
    gl_FragColor = vec4(uColor, rim * uIntensity);
  }
`

function GlowShell({
  radius,
  color,
  intensity,
}: {
  radius: number
  color: string
  intensity: number
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

let diamondTexture: THREE.Texture | null = null

function getDiamondTexture(): THREE.Texture {
  if (diamondTexture) return diamondTexture

  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return new THREE.Texture()

  const center = size / 2
  const fill = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    size * 0.48,
  )
  fill.addColorStop(0, 'rgba(255,255,235,1)')
  fill.addColorStop(0.28, 'rgba(255,236,150,1)')
  fill.addColorStop(0.7, 'rgba(255,214,74,1)')
  fill.addColorStop(1, 'rgba(255,200,0,0.05)')

  context.fillStyle = fill
  context.beginPath()
  context.moveTo(center, size * 0.06)
  context.lineTo(size * 0.78, center)
  context.lineTo(center, size * 0.94)
  context.lineTo(size * 0.22, center)
  context.closePath()
  context.fill()

  const core = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    size * 0.16,
  )
  core.addColorStop(0, 'rgba(255,255,255,1)')
  core.addColorStop(0.5, 'rgba(255,247,198,0.9)')
  core.addColorStop(1, 'rgba(255,225,100,0)')
  context.fillStyle = core
  context.beginPath()
  context.arc(center, center, size * 0.16, 0, Math.PI * 2)
  context.fill()

  diamondTexture = new THREE.CanvasTexture(canvas)
  diamondTexture.colorSpace = THREE.SRGBColorSpace
  diamondTexture.needsUpdate = true
  return diamondTexture
}

function Earth() {
  const sprite = useMemo(() => getDotTexture(), [])

  return (
    <group position={EARTH_POS}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 48, 48]} />
        <meshStandardMaterial
          color="#0a192f"
          emissive="#0b2a4a"
          emissiveIntensity={0.36}
          roughness={0.55}
          metalness={0.1}
        />
      </mesh>
      <GlowShell radius={EARTH_RADIUS + 0.045} color="#4f8fc0" intensity={0.22} />
      <sprite scale={[1.4, 1.4, 1]}>
        <spriteMaterial
          map={sprite}
          color="#4f8fc0"
          transparent
          opacity={0.03}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function ringPositions(radius: number, count = 64): Float32Array {
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = Math.sin(angle) * radius
    positions[index * 3 + 2] = 0
  }
  return positions
}

const GALAXY_RING = ringPositions(0.82, 60)

function Galaxy() {
  const sprite = useMemo(() => getDotTexture(), [])

  return (
    <group position={GALAXY_POS}>
      <mesh renderOrder={4}>
        <sphereGeometry args={[GALAXY_RADIUS, 48, 48]} />
        <meshStandardMaterial
          color="#d97706"
          emissive="#b45309"
          emissiveIntensity={0.6}
          transparent
          opacity={0.4}
          roughness={0.45}
          metalness={0.05}
          depthWrite={false}
        />
      </mesh>
      <GlowShell radius={GALAXY_RADIUS + 0.08} color="#d97706" intensity={0.25} />

      <points frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[GALAXY_RING, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color="#e6b25a"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.8}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}

function Source() {
  const glow = useMemo(() => getDotTexture(), [])
  const diamond = useMemo(() => getDiamondTexture(), [])

  return (
    <group position={SOURCE_POS}>
      <sprite scale={[0.95, 0.95, 1]} renderOrder={6}>
        <spriteMaterial
          map={glow}
          color="#ffd54a"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite scale={[0.58, 0.58, 1]} renderOrder={7}>
        <spriteMaterial
          map={diamond}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </group>
  )
}

function SignalPulse({
  curve,
  color,
  duration,
  animate,
}: {
  curve: THREE.Curve<THREE.Vector3>
  color: string
  duration: number
  animate: boolean
}) {
  const pulse = useRef<THREE.Group>(null)
  const sprite = useMemo(() => getDotTexture(), [])
  const period = 8

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
      <mesh renderOrder={10}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} depthTest={false} toneMapped={false} />
      </mesh>
      <sprite scale={[0.5, 0.5, 1]} renderOrder={11}>
        <spriteMaterial
          map={sprite}
          color={color}
          transparent
          opacity={0.6}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  )
}

function DiagramLabel({
  position,
  className,
  portal,
  children,
}: {
  position: [number, number, number]
  className?: string
  portal: RefObject<HTMLElement>
  children: ReactNode
}) {
  return (
    <Html
      position={position}
      center
      portal={portal}
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none', userSelect: 'none' }}
    >
      <div className={`frb-diagram-label ${className ?? ''}`}>{children}</div>
    </Html>
  )
}

function CameraRig() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const portrait = width / Math.max(height, 1) < 1
    camera.position.set(3, portrait ? 2.8 : 1.9, portrait ? 17.5 : 9.8)
    camera.fov = portrait ? 42 : 30
    camera.lookAt(3, portrait ? 0.45 : 0.35, 0)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

function Scene({
  animate,
  portal,
}: {
  animate: boolean
  portal: RefObject<HTMLElement>
}) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[-4, 6, 8]} intensity={0.9} color="#fff3df" />
      <pointLight position={[2, 1, 4]} intensity={1.0} color="#d97706" distance={8} />

      <Stars
        radius={80}
        depth={50}
        count={600}
        factor={1.0}
        saturation={0}
        fade
        speed={animate ? 0.08 : 0}
      />

      <Earth />
      <Galaxy />
      <Source />

      {/* Direct, unlensed path — thin dashed deep-sky blue. */}
      <Line
        points={[PATH_START, PATH_END]}
        color="#38bdf8"
        lineWidth={0.7}
        dashed
        dashSize={0.12}
        gapSize={0.1}
        transparent
        opacity={0.72}
        depthWrite={false}
        renderOrder={1}
      />

      {/* Delayed path — a low gold glow under a solid gold core. */}
      <Line
        points={DELAYED_POINTS}
        color="#b8860b"
        lineWidth={5}
        transparent
        opacity={0.12}
        depthWrite={false}
        renderOrder={2}
        blending={THREE.AdditiveBlending}
      />
      <Line
        points={DELAYED_POINTS}
        color="#ffcf6b"
        lineWidth={1.8}
        transparent
        opacity={0.9}
        depthWrite={false}
        renderOrder={3}
        blending={THREE.AdditiveBlending}
      />

      <SignalPulse
        curve={DIRECT_CURVE}
        color="#f4f8ff"
        duration={1.4}
        animate={animate}
      />
      <SignalPulse
        curve={DELAYED_CURVE}
        color="#ffd166"
        duration={5.2}
        animate={animate}
      />

      <DiagramLabel position={[0, 0.72, 0]} className="frb-diagram-label--observer" portal={portal}>
        Observer
      </DiagramLabel>
      <DiagramLabel position={[2, 1.42, 0]} className="frb-diagram-label--galaxy" portal={portal}>
        Lensing Galaxy
      </DiagramLabel>
      <DiagramLabel position={[6, 0.62, 0]} className="frb-diagram-label--source" portal={portal}>
        FRB Source
      </DiagramLabel>
      <DiagramLabel position={[3.15, 2.05, 0]} className="frb-diagram-label--delta" portal={portal}>
        Δt = 24.9 days
      </DiagramLabel>
    </>
  )
}

export function FrbMechanism3D({ animate = true }: { animate?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const inView = useInView(containerRef, { margin: '200px' })

  return (
    <div ref={containerRef} className="frb-scene__canvas">
      <Canvas
        camera={{ position: [3, 1.9, 9.8], fov: 30 }}
        dpr={[1, 2]}
        frameloop={inView ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <CameraRig />
        <Scene animate={animate} portal={containerRef as unknown as RefObject<HTMLElement>} />
      </Canvas>
    </div>
  )
}
