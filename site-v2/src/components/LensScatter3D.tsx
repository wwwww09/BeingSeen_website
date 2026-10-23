import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

type LensRow = [number, number, number]

interface LensFeed {
  fields: [string, string, string]
  count: number
  rows: LensRow[]
  supernovae: { name: string; ra: number; dec: number; z: number }[]
}

const FALLBACK: LensFeed = {
  fields: ['ra', 'dec', 'z'],
  count: 6,
  rows: [
    [12.3, 18.2, 0.42],
    [45.8, -12.4, 0.86],
    [92.1, 41.7, 0.31],
    [148.6, -3.2, 1.12],
    [210.4, 28.5, 0.64],
    [301.2, -35.1, 1.48],
  ],
  supernovae: [{ name: 'SN Refsdal', ra: 177.5, dec: -20.8, z: 1.49 }],
}

/**
 * RA/Dec/redshift -> a 3D sphere.
 * RA is longitude, Dec is latitude; redshift becomes radius so the
 * furthest systems sit deeper in the cloud.
 */
function toCartesian(ra: number, dec: number, z: number): [number, number, number] {
  const phi = ((90 - dec) * Math.PI) / 180
  const theta = (ra * Math.PI) / 180
  const radius = 7 + z * 3.2
  const sinPhi = Math.sin(phi)
  return [
    radius * sinPhi * Math.cos(theta),
    radius * Math.cos(phi),
    radius * sinPhi * Math.sin(theta),
  ]
}

function Scatter({ feed }: { feed: LensFeed }) {
  const { positions, colors } = useMemo(() => {
    const all = [...feed.rows.map((r) => ({ ...r, known: false }))]
    const known = feed.supernovae.map((s) => [s.ra, s.dec, s.z] as LensRow)
    const positions = new Float32Array((all.length + known.length) * 3)
    const colors = new Float32Array((all.length + known.length) * 3)
    const palette = [new THREE.Color('#8db7ff'), new THREE.Color('#d6e6ff'), new THREE.Color('#f2d6a2')]
    all.forEach((r, i) => {
      const [x, y, z] = toCartesian(r[0], r[1], r[2])
      positions.set([x, y, z], i * 3)
      const c = palette[Math.min(2, Math.floor((r[2] / 2.2) * 3))]
      colors.set([c.r, c.g, c.b], i * 3)
    })
    known.forEach((r, i) => {
      const idx = all.length + i
      const [x, y, z] = toCartesian(r[0], r[1], r[2])
      positions.set([x, y, z], idx * 3)
      colors.set([1, 0.86, 0.55], idx * 3)
    })
    return { positions, colors }
  }, [feed])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        vertexColors
        transparent
        opacity={0.92}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export function LensScatter3D() {
  const [feed, setFeed] = useState<LensFeed>(FALLBACK)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/data/lens-systems.sample.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('no feed'))))
      .then((data: LensFeed) => {
        if (!cancelled && Array.isArray(data.rows)) {
          setFeed(data)
          setLive(true)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="lens-scatter">
      <div className="lens-scatter__canvas">
        <Canvas camera={{ position: [0, 5, 16], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
          <color attach="background" args={['#05060a']} />
          <Scatter feed={feed} />
          <gridHelper args={[22, 22, '#2c3747', '#131a23']} position={[0, -6, 0]} />
          <axesHelper args={[4.2]} />
          <OrbitControls
            enablePan={false}
            minDistance={8}
            maxDistance={30}
            autoRotate
            autoRotateSpeed={0.22}
          />
        </Canvas>
      </div>
      <div className="lens-scatter__axes" aria-hidden="true">
        <span>RA</span>
        <span>Dec</span>
        <span>Redshift</span>
      </div>
      <div className="lens-scatter__legend">
        <span><i className="lens-scatter__dot" /> {live ? feed.count.toLocaleString() : 'sample'} lens systems</span>
        <span><i className="lens-scatter__dot lens-scatter__dot--known" /> {feed.supernovae.length} known lensed supernovae</span>
      </div>
    </div>
  )
}
