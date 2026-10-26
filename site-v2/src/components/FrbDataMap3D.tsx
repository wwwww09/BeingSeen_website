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
  regular: Float32Array
  candidates: Float32Array
  pairLines: Vec3[][]
  total: number
  candidateCount: number
  pairCount: number
}

function makeNormalizer(values: number[], transform: (value: number) => number) {
  const transformed = values.map(transform)
  const min = Math.min(...transformed)
  const max = Math.max(...transformed)
  return (value: number) => {
    if (!Number.isFinite(value) || max === min) return 0
    return ((transform(value) - min) / (max - min)) * 20 - 10
  }
}

function buildCloud(data: FrbData): CloudData {
  const rows = data.all_frbs
  const x = makeNormalizer(
    rows.map((row) => row.ra),
    (value) => value,
  )
  const y = makeNormalizer(
    rows.map((row) => row.dec),
    (value) => value,
  )
  const z = makeNormalizer(
    rows.map((row) => row.dm),
    (value) => Math.log10(Math.max(value, 0) + 1),
  )

  const toPosition = (row: FrbRow): Vec3 => [
    x(row.ra),
    y(row.dec),
    z(row.dm),
  ]

  const regular = new Float32Array(rows.length * 3)
  rows.forEach((row, index) => {
    const [px, py, pz] = toPosition(row)
    regular[index * 3] = px
    regular[index * 3 + 1] = py
    regular[index * 3 + 2] = pz
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
      pairLines.push([toPosition(first), toPosition(second)])
    }
  }

  const candidates = new Float32Array(candidateRows.length * 3)
  candidateRows.forEach((row, index) => {
    const [px, py, pz] = toPosition(row)
    candidates[index * 3] = px
    candidates[index * 3 + 1] = py
    candidates[index * 3 + 2] = pz
  })

  return {
    regular,
    candidates,
    pairLines,
    total: rows.length,
    candidateCount: candidateRows.length,
    pairCount: data.candidates.length,
  }
}

function ResponsiveCamera() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const portrait = width / Math.max(height, 1) < 1
    camera.position.set(
      portrait ? 25 : 19,
      portrait ? 16 : 12,
      portrait ? 31 : 24,
    )
    camera.fov = portrait ? 46 : 42
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

function FrbCloud({ cloud }: { cloud: CloudData }) {
  const dot = useMemo(() => getDotTexture(), [])

  return (
    <>
      <gridHelper
        args={[24, 24, '#1a1a1a', '#1a1a1a']}
        position={[0, -10, 0]}
      >
        <lineBasicMaterial
          attach="material"
          color="#1a1a1a"
          transparent
          opacity={0.14}
        />
      </gridHelper>

      {/* the catalogue — intentionally quiet */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.regular, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          color="#8fc4ff"
          size={0.18}
          sizeAttenuation
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* candidate halos, then the four bright cores */}
      <points frustumCulled={false} renderOrder={4}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.candidates, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          color="#ffcf8b"
          size={2.0}
          sizeAttenuation
          transparent
          opacity={0.24}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points frustumCulled={false} renderOrder={5}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[cloud.candidates, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          color="#ffcf8b"
          size={0.65}
          sizeAttenuation
          transparent
          opacity={0.95}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {cloud.pairLines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#ffcf8b"
          lineWidth={0.9}
          transparent
          opacity={0.34}
          depthWrite={false}
          depthTest={false}
        />
      ))}
    </>
  )
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
        aria-label={`3D scatter plot of ${cloud.total} fast radio bursts. Right ascension is the horizontal axis, declination the vertical axis, and dispersion measure on a logarithmic depth axis. Four candidate bursts are highlighted in gold.`}
      >
        <Canvas
          camera={{ position: [24, 15, 30], fov: 42 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <ResponsiveCamera />
          <FrbCloud cloud={cloud} />
          <OrbitControls
            makeDefault
            target={[0, 0, 0]}
            enablePan={false}
            enableZoom
            minDistance={16}
            maxDistance={70}
            minPolarAngle={0.25}
            maxPolarAngle={Math.PI / 2 + 0.08}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.55}
          />
        </Canvas>
      </div>

      <p className="frb-map__hint">Drag to rotate · scroll to zoom</p>

      <ul className="frb-map__legend" aria-label="Data map legend">
        <li>
          <i
            className="frb-map-dot frb-map-dot--detected"
            aria-hidden="true"
          />
          Detected FRBs <b>{cloud.total} of 690 plotted</b>
        </li>
        <li>
          <i
            className="frb-map-dot frb-map-dot--candidate"
            aria-hidden="true"
          />
          Candidate FRBs{' '}
          <b>
            {cloud.candidateCount} · {cloud.pairCount} pairs
          </b>
        </li>
      </ul>

      <p className="frb-map__axes">RA → X · Dec → Y · DM (log) → Z</p>
    </div>
  )
}
