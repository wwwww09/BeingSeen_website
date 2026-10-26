import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface FrbRow {
  frb_name: string
  ra: number
  dec: number
  dm: number
  snr?: number
}

interface CandidatePair {
  frb1: string
  frb2: string
  dm_diff: number
  time_diff_days: number
}

interface FrbData {
  all_frbs: FrbRow[]
  candidates: CandidatePair[]
}

type Vec3 = [number, number, number]

interface CloudData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  phases: Float32Array
  candidatePositions: Float32Array
  pairLines: Vec3[][]
  total: number
  candidateCount: number
  pairCount: number
  dmMin: number
  dmMax: number
}

const SPHERE_RADIUS = 10

/*
 * A saturated Viridis-style DM ramp. The HTML legend uses the same stops, so
 * the bar and the particles agree. Colours are never mixed to white.
 */
const DM_RAMP: [number, number, number][] = [
  [0.267, 0.005, 0.329], // #440154
  [0.229, 0.322, 0.545], // #3a528b
  [0.128, 0.567, 0.551], // #20918c
  [0.369, 0.789, 0.383], // #5ec962
  [0.835, 0.839, 0.173], // #d5d62c
  [1.0, 0.7, 0.145], // #ffb325
]

function dmColor(value: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, value))
  const scaled = t * (DM_RAMP.length - 1)
  const index = Math.min(DM_RAMP.length - 2, Math.floor(scaled))
  const fraction = scaled - index
  const low = DM_RAMP[index]
  const high = DM_RAMP[index + 1]

  return [
    low[0] + (high[0] - low[0]) * fraction,
    low[1] + (high[1] - low[1]) * fraction,
    low[2] + (high[2] - low[2]) * fraction,
  ]
}

/** r = dm / max(dm), with RA/Dec defining the unit-sphere direction. */
function toSphere(
  row: FrbRow,
  maxDm: number,
  scale = SPHERE_RADIUS,
  radialOffset = 0,
): Vec3 {
  const baseRadius = (row.dm / Math.max(maxDm, 1e-6)) * scale
  const radius = Math.max(0.02, baseRadius + radialOffset)
  const ra = (row.ra * Math.PI) / 180
  const dec = (row.dec * Math.PI) / 180
  const cosDec = Math.cos(dec)

  return [
    radius * cosDec * Math.cos(ra),
    radius * cosDec * Math.sin(ra),
    radius * Math.sin(dec),
  ]
}

function radialJitter(index: number) {
  const value = Math.sin(index * 12.9898) * 43758.5453
  return (value - Math.floor(value) - 0.5) * 0.3
}

function twinklePhase(index: number) {
  const value = Math.sin(index * 78.233) * 43758.5453
  return (value - Math.floor(value)) * Math.PI * 2
}

function buildCloud(data: FrbData): CloudData {
  const rows = data.all_frbs
  const dmMin = Math.min(...rows.map((row) => row.dm))
  const dmMax = Math.max(...rows.map((row) => row.dm), 1e-6)
  const maxSnr = Math.max(...rows.map((row) => row.snr ?? 0), 1e-6)

  const positions = new Float32Array(rows.length * 3)
  const colors = new Float32Array(rows.length * 3)
  const sizes = new Float32Array(rows.length)
  const phases = new Float32Array(rows.length)

  rows.forEach((row, index) => {
    const [x, y, z] = toSphere(row, dmMax, SPHERE_RADIUS, radialJitter(index))
    const color = dmColor(row.dm / dmMax)

    positions[index * 3] = x
    positions[index * 3 + 1] = y
    positions[index * 3 + 2] = z

    colors[index * 3] = color[0]
    colors[index * 3 + 1] = color[1]
    colors[index * 3 + 2] = color[2]

    // World-space particle size, centred on 0.05: small, softly glowing
    // points that still encode SNR without turning into plastic discs.
    sizes[index] = 0.05 * (0.72 + (Math.max(0, row.snr ?? 0) / maxSnr) * 0.56)
    phases[index] = twinklePhase(index)
  })

  const byName = new Map(rows.map((row) => [row.frb_name, row]))
  const candidateRows: FrbRow[] = []
  const seen = new Set<string>()
  const pairLines: Vec3[][] = []

  for (const pair of data.candidates) {
    const first = byName.get(pair.frb1)
    const second = byName.get(pair.frb2)

    for (const row of [first, second]) {
      if (!row || seen.has(row.frb_name)) continue
      seen.add(row.frb_name)
      candidateRows.push(row)
    }

    if (first && second) {
      pairLines.push([toSphere(first, dmMax), toSphere(second, dmMax)])
    }
  }

  const candidatePositions = new Float32Array(candidateRows.length * 3)
  candidateRows.forEach((row, index) => {
    const [x, y, z] = toSphere(row, dmMax)
    candidatePositions[index * 3] = x
    candidatePositions[index * 3 + 1] = y
    candidatePositions[index * 3 + 2] = z
  })

  return {
    positions,
    colors,
    sizes,
    phases,
    candidatePositions,
    pairLines,
    total: rows.length,
    candidateCount: candidateRows.length,
    pairCount: data.candidates.length,
    dmMin,
    dmMax,
  }
}

const POINT_VERTEX = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uDpr;
  uniform float uTime;

  void main() {
    vColor = aColor;
    float twinkle = 0.78 + 0.22 * sin(uTime * 2.35 + aPhase);
    vTwinkle = twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // aSize is in world units (0.05 base). This is roughly twice the previous
    // point size; the cap keeps the densest part of the cluster readable.
    float perspective = 18.0 / max(-mvPosition.z, 1.0);
    gl_PointSize = clamp(
      aSize * uDpr * 520.0 * perspective * (0.94 + 0.06 * twinkle),
      2.0,
      26.0
    );
    gl_Position = projectionMatrix * mvPosition;
  }
`

const POINT_FRAGMENT = `
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uOpacity;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (distanceToCenter > 1.0) discard;

    // Circular radial gradient: a compact coloured core with a smooth halo.
    // No white mix, so each star keeps its Viridis colour.
    float halo = pow(max(0.0, 1.0 - distanceToCenter), 2.0);
    float core = pow(max(0.0, 1.0 - distanceToCenter), 6.0);
    vec3 color = vColor * (0.95 + 0.4 * core);
    float alpha = max(core, halo * 0.22) * uOpacity * vTwinkle;

    gl_FragColor = vec4(color, alpha);
  }
`

function FrbPoints({ cloud }: { cloud: CloudData }) {
  const dpr = useThree((state) => state.viewport.dpr)
  const material = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points frustumCulled={false} renderOrder={2}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[cloud.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[cloud.colors, 3]}
        />
        <bufferAttribute attach="attributes-aSize" args={[cloud.sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[cloud.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={{
          uDpr: { value: dpr },
          uTime: { value: 0 },
          uOpacity: { value: 0.95 },
        }}
        vertexShader={POINT_VERTEX}
        fragmentShader={POINT_FRAGMENT}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
        toneMapped={false}
      />
    </points>
  )
}

const FRB_GLOW_VERTEX = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uDpr;
  uniform float uTime;

  void main() {
    vColor = aColor;
    float twinkle = 0.8 + 0.2 * sin(uTime * 2.35 + aPhase);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Broad additive aura. It is much wider than the core but deliberately
    // low-opacity, so it adds glow without bleaching the Viridis colour.
    float perspective = 18.0 / max(-mvPosition.z, 1.0);
    gl_PointSize = clamp(
      aSize * uDpr * 1000.0 * perspective * (0.9 + 0.1 * twinkle),
      8.0,
      54.0
    );
    gl_Position = projectionMatrix * mvPosition;
  }
`

const FRB_GLOW_FRAGMENT = `
  varying vec3 vColor;
  uniform float uOpacity;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (distanceToCenter > 1.0) discard;

    float glow = pow(max(0.0, 1.0 - distanceToCenter), 2.6);
    gl_FragColor = vec4(vColor, glow * uOpacity);
  }
`

function FrbGlow({ cloud }: { cloud: CloudData }) {
  const dpr = useThree((state) => state.viewport.dpr)
  const material = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points frustumCulled={false} renderOrder={1}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[cloud.positions, 3]}
        />
        <bufferAttribute
          attach="attributes-aColor"
          args={[cloud.colors, 3]}
        />
        <bufferAttribute attach="attributes-aSize" args={[cloud.sizes, 1]} />
        <bufferAttribute attach="attributes-aPhase" args={[cloud.phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={{
          uDpr: { value: dpr },
          uTime: { value: 0 },
          uOpacity: { value: 0.07 },
        }}
        vertexShader={FRB_GLOW_VERTEX}
        fragmentShader={FRB_GLOW_FRAGMENT}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  )
}

const CANDIDATE_VERTEX = `
  uniform float uDpr;
  uniform float uSize;
  uniform float uTime;
  varying float vPulse;

  void main() {
    float pulse = 1.0 + 0.08 * sin(uTime * 2.1 + position.x);
    vPulse = pulse;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uDpr * pulse;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const CANDIDATE_FRAGMENT = `
  uniform vec3 uColor;
  varying float vPulse;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (distanceToCenter > 1.0) discard;

    // #FFD700 core with a soft golden halo.
    float glow = pow(max(0.0, 1.0 - distanceToCenter), 2.2) * 0.55;
    float core = smoothstep(0.22, 0.0, distanceToCenter);
    vec3 color = mix(uColor, vec3(1.0, 0.94, 0.6), core * 0.35);
    float alpha = clamp(glow + core, 0.0, 1.0) * vPulse;

    gl_FragColor = vec4(color, alpha);
  }
`

function GoldCandidates({ cloud }: { cloud: CloudData }) {
  const dpr = useThree((state) => state.viewport.dpr)
  const material = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!material.current) return
    material.current.uniforms.uTime.value = clock.elapsedTime
  })

  if (cloud.candidatePositions.length === 0) return null

  return (
    <>
      <points frustumCulled={false} renderOrder={6}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.candidatePositions, 3]}
          />
        </bufferGeometry>
        <shaderMaterial
          ref={material}
          uniforms={{
            uDpr: { value: dpr },
            uSize: { value: 48 },
            uTime: { value: 0 },
            uColor: { value: new THREE.Color('#ffd700') },
          }}
          vertexShader={CANDIDATE_VERTEX}
          fragmentShader={CANDIDATE_FRAGMENT}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.NormalBlending}
          toneMapped={false}
        />
      </points>

      {cloud.pairLines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#ffd700"
          lineWidth={0.8}
          transparent
          opacity={0.35}
          depthWrite={false}
          depthTest={false}
        />
      ))}
    </>
  )
}

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const portrait = width / Math.max(height, 1) < 1
    camera.position.set(
      portrait ? 19 : 14,
      portrait ? 11 : 8,
      portrait ? 22 : 16,
    )
    camera.fov = portrait ? 52 : 46
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

function formatDm(value: number) {
  return Math.round(value).toLocaleString('en-US')
}

export function FrbDataMap3D() {
  const [cloud, setCloud] = useState<CloudData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch(`${import.meta.env.BASE_URL}frb_data.json`)
      .then((response) => {
        if (!response.ok) throw new Error('FRB catalogue failed')
        return response.json() as Promise<FrbData>
      })
      .then((data) => {
        if (cancelled) return
        setCloud(buildCloud(data))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (failed) {
    return (
      <p className="frb-map__status">
        The FRB catalogue could not be loaded.
      </p>
    )
  }

  if (!cloud) {
    return <p className="frb-map__status">Loading the FRB catalogue…</p>
  }

  return (
    <div className="frb-map">
      <div
        className="frb-map__canvas"
        role="img"
        aria-label={`Spherical 3D scatter plot of ${cloud.total} fast radio bursts. Each burst is placed by right ascension and declination, with radius set by dispersion measure and color following a violet-to-gold dispersion-measure scale. Four candidate bursts are highlighted as large glowing gold stars.`}
      >
        <Canvas
          camera={{ position: [18, 10, 20], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ResponsiveCamera />
          <FrbGlow cloud={cloud} />
          <FrbPoints cloud={cloud} />
          <GoldCandidates cloud={cloud} />
          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            enablePan={false}
            enableZoom
            minDistance={14}
            maxDistance={55}
            minPolarAngle={0.2}
            maxPolarAngle={Math.PI - 0.2}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.55}
          />
        </Canvas>
      </div>

      <div className="frb-map__legend" aria-label="Map legend">
        <div className="frb-map__dm">
          <span className="frb-map__dm-label">DM</span>
          <span className="frb-map__dm-bar" aria-hidden="true" />
          <span className="frb-map__dm-range">
            {formatDm(cloud.dmMin)}–{formatDm(cloud.dmMax)}
          </span>
        </div>
        <span className="frb-map__key">
          <i className="frb-map__gold-dot" aria-hidden="true" />
          Candidate FRBs{' '}
          <b>
            {cloud.candidateCount} · {cloud.pairCount} pairs
          </b>
        </span>
      </div>

      <p className="frb-map__hint">
        {cloud.total} of 690 plotted · point size ∝ SNR · drag to rotate ·
        scroll to zoom
      </p>
      <p className="frb-map__axes">
        r = DM / max(DM) · RA, Dec → direction
      </p>
    </div>
  )
}
