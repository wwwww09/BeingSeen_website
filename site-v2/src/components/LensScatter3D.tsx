import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'

interface LensDatum {
  ra: number
  dec: number
  redshift: number
}

interface SneDatum extends LensDatum {
  name: string
}

interface LensFeed {
  lenses: LensDatum[]
  sne: SneDatum[]
}

const FALLBACK: LensFeed = {
  lenses: [
    { ra: 12.6, dec: -17.6, redshift: 0.4 },
    { ra: 45.8, dec: -12.4, redshift: 0.86 },
    { ra: 92.1, dec: 41.7, redshift: 0.31 },
    { ra: 148.6, dec: -3.2, redshift: 1.12 },
    { ra: 210.4, dec: 28.5, redshift: 0.64 },
    { ra: 301.2, dec: -35.1, redshift: 1.48 },
  ],
  sne: [{ name: 'SN Refsdal', ra: 177.5, dec: -20.8, redshift: 1.49 }],
}

/** RA -> X, Dec -> Y, redshift -> Z, all normalised to a [-10, 10] cube. */
function toXYZ(point: LensDatum, maxZ: number): [number, number, number] {
  return [
    (point.ra / 360) * 20 - 10,
    (point.dec / 90) * 10,
    (point.redshift / maxZ) * 20 - 10,
  ]
}

function LensCloud({ lenses, maxZ }: { lenses: LensDatum[]; maxZ: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(lenses.length * 3)
    lenses.forEach((lens, i) => {
      arr.set(toXYZ(lens, maxZ), i * 3)
    })
    return arr
  }, [lenses, maxZ])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#6f9fd8"
        size={0.055}
        transparent
        opacity={0.48}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function SneMarkers({ sne, maxZ }: { sne: SneDatum[]; maxZ: number }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(sne.length * 3)
    sne.forEach((sn, i) => {
      arr.set(toXYZ(sn, maxZ), i * 3)
    })
    return arr
  }, [sne, maxZ])

  return (
    <>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ff7a45"
          size={0.3}
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#ff5a2a"
          size={0.75}
          transparent
          opacity={0.18}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  )
}

export function LensScatter3D() {
  const [feed, setFeed] = useState<LensFeed>(FALLBACK)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/lens_data.json')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('no feed'))))
      .then((data: LensFeed) => {
        if (!cancelled && Array.isArray(data.lenses) && Array.isArray(data.sne)) {
          setFeed(data)
          setLive(true)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const maxZ = useMemo(
    () =>
      Math.max(
        0.01,
        ...feed.lenses.map((lens) => lens.redshift),
        ...feed.sne.map((sn) => sn.redshift),
      ),
    [feed],
  )

  return (
    <div className="lens-scatter">
      <div className="lens-scatter__canvas">
        <Canvas camera={{ position: [20, 14, 22], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
          <color attach="background" args={['#080a10']} />
          <LensCloud lenses={feed.lenses} maxZ={maxZ} />
          <SneMarkers sne={feed.sne} maxZ={maxZ} />
          <gridHelper args={[24, 24, '#222222', '#222222']} position={[0, -10, 0]}>
            <lineBasicMaterial attach="material" color="#222222" transparent opacity={0.18} />
          </gridHelper>
          <OrbitControls
            enablePan={false}
            minDistance={12}
            maxDistance={48}
            target={[-6, 0, 0]}
            autoRotate
            autoRotateSpeed={0.2}
          />
        </Canvas>
      </div>
      <div className="lens-scatter__hud">
        <div className="lens-scatter__axes" aria-hidden="true">
          <span>RA → X</span>
          <span>Dec → Y</span>
          <span>Redshift → Z</span>
        </div>
        <div className="lens-scatter__legend">
          <span>
            <i className="lens-scatter__dot" /> {live ? feed.lenses.length.toLocaleString() : 'sample'} lenses
          </span>
          <span>
            <i className="lens-scatter__dot lens-scatter__dot--known" /> {feed.sne.length} lensed SNe
          </span>
        </div>
      </div>
    </div>
  )
}
