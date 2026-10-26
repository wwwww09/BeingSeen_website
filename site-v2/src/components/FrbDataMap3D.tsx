import { Canvas, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { getDotTexture } from '../scene/dotTexture'

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
 * A deliberately dim DM ramp: dark purple -> deep blue -> muted gold.
 * The HTML legend uses the same stops, so the bar and the particles agree.
 */
const DM_RAMP: [number, number, number][] = [
  [0.12, 0.05, 0.18], // #1f0d2e
  [0.17, 0.08, 0.29], // #2b144a
  [0.12, 0.2, 0.4], // #1f3366
  [0.27, 0.38, 0.56], // #45608f
  [0.48, 0.4, 0.26], // #7a6642
  [0.78, 0.63, 0.38], // #c7a161
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

function buildCloud(data: FrbData): CloudData {
  const rows = data.all_frbs
  const dmMin = Math.min(...rows.map((row) => row.dm))
  const dmMax = Math.max(...rows.map((row) => row.dm), 1e-6)
  const maxSnr = Math.max(...rows.map((row) => row.snr ?? 0), 1e-6)

  const positions = new Float32Array(rows.length * 3)
  const colors = new Float32Array(rows.length * 3)
  const sizes = new Float32Array(rows.length)

  rows.forEach((row, index) => {
    const [x, y, z] = toSphere(row, dmMax, SPHERE_RADIUS, radialJitter(index))
    const color = dmColor(row.dm / dmMax)

    positions[index * 3] = x
    positions[index * 3 + 1] = y
    positions[index * 3 + 2] = z

    colors[index * 3] = color[0]
    colors[index * 3 + 1] = color[1]
    colors[index * 3 + 2] = color[2]

    // Fine dust, still SNR-ranked: roughly 1.2 px to 3.8 px.
    sizes[index] = (Math.max(0, row.snr ?? 0) / maxSnr) * 4 + 2.4
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
  attribute vec3 aColor;
  varying vec3 vColor;
  uniform float uDpr;

  void main() {
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uDpr;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const POINT_FRAGMENT = `
  varying vec3 vColor;
  uniform float uOpacity;

  void main() {
    float distanceToCenter = length(gl_PointCoord - vec2(0.5));
    if (distanceToCenter > 0.5) discard;

    float alpha = smoothstep(0.5, 0.05, distanceToCenter);
    gl_FragColor = vec4(vColor, alpha * uOpacity);
  }
`

function FrbPoints({ cloud }: { cloud: CloudData }) {
  const dpr = useThree((state) => state.viewport.dpr)

  return (
    <points frustumCulled={false}>
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
      </bufferGeometry>
      <shaderMaterial
        uniforms={{
          uDpr: { value: dpr },
          uOpacity: { value: 0.5 },
        }}
        vertexShader={POINT_VERTEX}
        fragmentShader={POINT_FRAGMENT}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

function GoldCandidates({ cloud }: { cloud: CloudData }) {
  const dpr = useThree((state) => state.viewport.dpr)
  const dot = useMemo(() => getDotTexture(), [])

  if (cloud.candidatePositions.length === 0) return null

  return (
    <>
      <points frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.candidatePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          color="#05070a"
          size={16 * dpr}
          sizeAttenuation={false}
          transparent
          opacity={0.7}
          depthWrite={false}
          depthTest={false}
        />
      </points>
      <points frustumCulled={false} renderOrder={6}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.candidatePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          color="#ad8c54"
          size={24 * dpr}
          sizeAttenuation={false}
          transparent
          opacity={0.14}
          depthWrite={false}
          depthTest={false}
        />
      </points>
      <points frustumCulled={false} renderOrder={7}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.candidatePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          color="#c9a45e"
          size={8 * dpr}
          sizeAttenuation={false}
          transparent
          opacity={0.95}
          depthWrite={false}
          depthTest={false}
          blending={THREE.NormalBlending}
        />
      </points>

      {cloud.pairLines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#ad8c54"
          lineWidth={0.6}
          transparent
          opacity={0.18}
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
      portrait ? 21 : 16,
      portrait ? 12 : 9,
      portrait ? 24 : 18,
    )
    camera.fov = portrait ? 50 : 44
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
        aria-label={`Spherical 3D scatter plot of ${cloud.total} fast radio bursts. Each burst is placed by right ascension and declination, with radius set by dispersion measure and color following the Viridis DM scale. Four candidate bursts are highlighted in gold.`}
      >
        <Canvas
          camera={{ position: [18, 10, 20], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ResponsiveCamera />
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
