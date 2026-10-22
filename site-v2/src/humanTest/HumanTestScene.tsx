import { useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 20_000

type Vec3 = [number, number, number]

type Part = {
  kind: 'ellipsoid' | 'capsule'
  a: Vec3
  b?: Vec3
  radii?: Vec3
  radius?: number
  weight: number
  arm: number
  leg: number
}

const PARTS: Part[] = [
  // torso / hips
  { kind: 'ellipsoid', a: [0, 1.16, 0], radii: [0.22, 0.34, 0.15], weight: 5.2, arm: 0, leg: 0 },
  { kind: 'ellipsoid', a: [0, 0.87, 0], radii: [0.2, 0.15, 0.14], weight: 1.6, arm: 0, leg: 0 },
  // head + neck
  { kind: 'ellipsoid', a: [0, 1.64, 0.01], radii: [0.13, 0.15, 0.13], weight: 2.2, arm: 0, leg: 0 },
  { kind: 'capsule', a: [0, 1.4, 0], b: [0, 1.53, 0.01], radius: 0.075, weight: 0.7, arm: 0, leg: 0 },
  // shoulders
  { kind: 'ellipsoid', a: [-0.2, 1.38, 0], radii: [0.1, 0.1, 0.1], weight: 0.5, arm: 0, leg: 0 },
  { kind: 'ellipsoid', a: [0.2, 1.38, 0], radii: [0.1, 0.1, 0.1], weight: 0.5, arm: 0, leg: 0 },
  // right / reaching arm
  { kind: 'capsule', a: [0.2, 1.38, 0], b: [0.27, 1.16, 0.03], radius: 0.075, weight: 1.4, arm: 1, leg: 0 },
  { kind: 'capsule', a: [0.27, 1.16, 0.03], b: [0.3, 0.9, 0.07], radius: 0.06, weight: 1.1, arm: 1, leg: 0 },
  { kind: 'ellipsoid', a: [0.3, 0.86, 0.08], radii: [0.075, 0.08, 0.065], weight: 0.45, arm: 1, leg: 0 },
  // left arm
  { kind: 'capsule', a: [-0.2, 1.38, 0], b: [-0.27, 1.16, 0.03], radius: 0.075, weight: 1.4, arm: 0, leg: 0 },
  { kind: 'capsule', a: [-0.27, 1.16, 0.03], b: [-0.3, 0.9, 0.07], radius: 0.06, weight: 1.1, arm: 0, leg: 0 },
  { kind: 'ellipsoid', a: [-0.3, 0.86, 0.08], radii: [0.075, 0.08, 0.065], weight: 0.45, arm: 0, leg: 0 },
  // left leg
  { kind: 'capsule', a: [-0.12, 0.85, 0], b: [-0.13, 0.48, 0.02], radius: 0.105, weight: 2.0, arm: 0, leg: 1 },
  { kind: 'capsule', a: [-0.13, 0.48, 0.02], b: [-0.14, 0.1, 0.05], radius: 0.085, weight: 1.8, arm: 0, leg: 1 },
  { kind: 'ellipsoid', a: [-0.15, 0.06, 0.08], radii: [0.11, 0.06, 0.15], weight: 0.6, arm: 0, leg: 1 },
  // right leg
  { kind: 'capsule', a: [0.12, 0.85, 0], b: [0.13, 0.48, 0.02], radius: 0.105, weight: 2.0, arm: 0, leg: -1 },
  { kind: 'capsule', a: [0.13, 0.48, 0.02], b: [0.14, 0.1, 0.05], radius: 0.085, weight: 1.8, arm: 0, leg: -1 },
  { kind: 'ellipsoid', a: [0.15, 0.06, 0.08], radii: [0.11, 0.06, 0.15], weight: 0.6, arm: 0, leg: -1 },
]


function samplePart(part: Part): Vec3 {
  if (part.kind === 'capsule' && part.b) {
    const dx = part.b[0] - part.a[0]
    const dy = part.b[1] - part.a[1]
    const dz = part.b[2] - part.a[2]
    const len = Math.hypot(dx, dy, dz) || 0.001
    const dir: Vec3 = [dx / len, dy / len, dz / len]
    const up: Vec3 = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]
    const u: Vec3 = [
      dir[1] * up[2] - dir[2] * up[1],
      dir[2] * up[0] - dir[0] * up[2],
      dir[0] * up[1] - dir[1] * up[0],
    ]
    const ul = Math.hypot(u[0], u[1], u[2]) || 1
    const ux = u[0] / ul
    const uy = u[1] / ul
    const uz = u[2] / ul
    const vx = dir[1] * uz - dir[2] * uy
    const vy = dir[2] * ux - dir[0] * uz
    const vz = dir[0] * uy - dir[1] * ux
    const t = Math.random()
    const theta = Math.random() * Math.PI * 2
    const radial = Math.cbrt(Math.random()) * (part.radius ?? 0.1)
    return [
      part.a[0] + dx * t + (ux * Math.cos(theta) + vx * Math.sin(theta)) * radial,
      part.a[1] + dy * t + (uy * Math.cos(theta) + vy * Math.sin(theta)) * radial,
      part.a[2] + dz * t + (uz * Math.cos(theta) + vz * Math.sin(theta)) * radial,
    ]
  }
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.cbrt(Math.random())
  const radii = part.radii ?? [0.1, 0.1, 0.1]
  return [
    part.a[0] + Math.sin(phi) * Math.cos(theta) * radii[0] * r,
    part.a[1] + Math.cos(phi) * radii[1] * r,
    part.a[2] + Math.sin(phi) * Math.sin(theta) * radii[2] * r,
  ]
}

function buildGeometry(): THREE.BufferGeometry {
  const total = PARTS.reduce((sum, part) => sum + part.weight, 0)
  const counts = PARTS.map((part) => Math.round((COUNT * part.weight) / total))
  const positions = new Float32Array(COUNT * 3)
  const arms = new Float32Array(COUNT)
  const legs = new Float32Array(COUNT)
  let index = 0
  for (let p = 0; p < PARTS.length; p++) {
    for (let i = 0; i < counts[p] && index < COUNT; i++, index++) {
      const v = samplePart(PARTS[p])
      positions[index * 3] = v[0]
      positions[index * 3 + 1] = v[1]
      positions[index * 3 + 2] = v[2]
      arms[index] = PARTS[p].arm
      legs[index] = PARTS[p].leg
    }
  }
  while (index < COUNT) {
    const v = samplePart(PARTS[0])
    positions[index * 3] = v[0]
    positions[index * 3 + 1] = v[1]
    positions[index * 3 + 2] = v[2]
    index++
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aArm', new THREE.BufferAttribute(arms, 1))
  geometry.setAttribute('aLeg', new THREE.BufferAttribute(legs, 1))
  return geometry
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uRun;
  uniform float uPixelRatio;

  attribute float aArm;
  attribute float aLeg;

  varying float vAlpha;

  void main() {
    vec3 p = position;

    // running: forward lean of the upper body
    float upper = smoothstep(0.82, 1.2, p.y);
    float lean = -0.2 * uRun * upper;
    float c = cos(lean);
    float s = sin(lean);
    p.xy = mat2(c, -s, s, c) * p.xy;

    // gentle running bob
    p.y += sin(uTime * 2.4) * 0.025 * uRun;

    // one hand reaching out and forward
    p.x += max(aArm, 0.0) * uRun * 0.16;
    p.z += max(aArm, 0.0) * uRun * (0.28 + 0.04 * sin(uTime * 2.4));
    p.y += max(aArm, 0.0) * uRun * 0.035;

    // simple opposing leg swing
    p.z += aLeg * sin(uTime * 2.4) * 0.1 * uRun;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = 0.011 * (620.0 / max(0.1, -mv.z)) * uPixelRatio;
    vAlpha = 0.5 + 0.18 * uRun;
  }
`

const fragmentShader = /* glsl */ `
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float core = smoothstep(0.5, 0.0, d);
    float a = vAlpha * core;
    if (a < 0.01) discard;
    gl_FragColor = vec4(0.72, 0.8, 1.0, a);
  }
`

function HumanPoints({ running }: { running: boolean }) {
  const { size } = useThree()
  const geometry = useMemo(() => buildGeometry(), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uRun: { value: 0 },
          uPixelRatio: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    const target = running ? 1 : 0
    const current = material.uniforms.uRun.value as number
    material.uniforms.uRun.value = current + (target - current) * 0.08
    material.uniforms.uPixelRatio.value = Math.min(2, state.gl.getPixelRatio())
  })

  return (
    <points
      geometry={geometry}
      material={material}
      position={[0, 0, 0]}
      scale={size.width < 900 ? 0.9 : 1}
      frustumCulled={false}
    />
  )
}

export function HumanTestScene({ running }: { running: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.1, far: 40, position: [0, 0.95, 5.1] }}
      onCreated={({ camera }) => camera.lookAt(0, 0.9, 0)}
    >
      <color attach="background" args={['#04060b']} />
      <HumanPoints running={running} />
    </Canvas>
  )
}
