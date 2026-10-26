import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { getDotTexture } from '../scene/dotTexture'
import { supernovae } from '../data/supernovae'

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

interface HoverPoint {
  index: number
  x: number
  y: number
}

/** Match feed names like "SN_Refsdal" to catalogue names robustly. */
const normalizeName = (name: string) =>
  name.replace(/[\s_]/g, '').toLowerCase()

/** The catalogue size quoted in the chapter copy. */
const LENS_TOTAL = 13941
const SNE_TOTAL = 5

/*
 * A tiny fallback so the canvas still renders something while the catalogue
 * loads (or if it fails). The five supernovae keep their real sky positions
 * from public/data/supernovae.json; only the lens cloud is a stand-in.
 */
const FALLBACK: LensFeed = {
  lenses: [
    { ra: 12.6, dec: -17.6, redshift: 0.4 },
    { ra: 45.8, dec: -12.4, redshift: 0.86 },
    { ra: 92.1, dec: 41.7, redshift: 0.31 },
    { ra: 148.6, dec: -3.2, redshift: 1.12 },
    { ra: 210.4, dec: 28.5, redshift: 0.64 },
    { ra: 301.2, dec: -35.1, redshift: 1.48 },
  ],
  sne: [
    { name: 'SN_H0pe', ra: 171.815, dec: 42.4258, redshift: 1.783 },
    { name: 'SN_Refsdal', ra: 177.3962, dec: 22.403, redshift: 1.49 },
    { name: 'iPTF16geu', ra: 316.0661, dec: -6.3401, redshift: 0.409 },
    { name: 'SN_Zwicky', ra: 53.1902, dec: -27.7401, redshift: 0.3544 },
    { name: 'PS1-10afx', ra: 332.8507, dec: 0.1621, redshift: 1.3883 },
  ],
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
        size={0.085}
        transparent
        opacity={0.85}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function SneMarkers({
  sne,
  maxZ,
  hoveredIndex,
  onHover,
}: {
  sne: SneDatum[]
  maxZ: number
  hoveredIndex: number | null
  onHover: (point: HoverPoint | null) => void
}) {
  const dpr = useThree((state) => state.viewport.dpr)
  const sprite = useMemo(() => getDotTexture(), [])
  const positions = useMemo(() => {
    const arr = new Float32Array(sne.length * 3)
    sne.forEach((sn, i) => {
      arr.set(toXYZ(sn, maxZ), i * 3)
    })
    return arr
  }, [sne, maxZ])

  const hoveredPosition =
    hoveredIndex !== null && hoveredIndex * 3 + 3 <= positions.length
      ? positions.slice(hoveredIndex * 3, hoveredIndex * 3 + 3)
      : null

  const showHover = (event: ThreeEvent<PointerEvent>) => {
    if (event.index === undefined) return
    const native = event.nativeEvent
    onHover({
      index: event.index,
      x: native.offsetX,
      y: native.offsetY,
    })
  }

  return (
    <>
      {/* dark backing keeps gold readable over the brightest part of the cloud */}
      <points frustumCulled={false} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color="#05070a"
          size={14 * dpr}
          transparent
          opacity={0.88}
          sizeAttenuation={false}
          depthWrite={false}
          depthTest={false}
        />
      </points>
      {/* wide, faint halo so five points still read against 13,941 */}
      <points
        frustumCulled={false}
        renderOrder={2}
        onPointerMove={showHover}
        onClick={showHover}
        onPointerOut={() => onHover(null)}
      >
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color="#ff9d3d"
          size={20 * dpr}
          transparent
          opacity={0.32}
          sizeAttenuation={false}
          depthWrite={false}
          depthTest={false}
          blending={THREE.NormalBlending}
        />
      </points>
      <points frustumCulled={false} renderOrder={3}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={sprite}
          color="#ffcf8b"
          size={6.5 * dpr}
          transparent
          opacity={1}
          sizeAttenuation={false}
          depthWrite={false}
          depthTest={false}
          blending={THREE.NormalBlending}
        />
      </points>
      {hoveredPosition ? (
        <points frustumCulled={false} renderOrder={4}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[hoveredPosition, 3]}
            />
          </bufferGeometry>
          <pointsMaterial
            map={sprite}
            color="#ffe8c4"
            size={30 * dpr}
            transparent
            opacity={0.42}
            sizeAttenuation={false}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ) : null}
    </>
  )
}

/**
 * A portrait canvas has a much narrower horizontal field of view. Widen the
 * lens on phones so the whole catalogue — and all five gold points — stays in
 * frame; desktop keeps the tighter 42° framing.
 */
function ResponsiveFraming() {
  const camera = useThree((state) => state.camera)
  const width = useThree((state) => state.size.width)
  const height = useThree((state) => state.size.height)

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const aspect = width / Math.max(height, 1)
    const fov = aspect < 1 ? 58 : 42
    if (camera.fov === fov) return
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, width, height])

  return null
}

export function LensScatter3D() {
  const [feed, setFeed] = useState<LensFeed>(FALLBACK)
  const [live, setLive] = useState(false)
  const [hover, setHover] = useState<HoverPoint | null>(null)

  const sneMeta = useMemo(
    () =>
      new Map(
        supernovae.map((event) => [normalizeName(event.name), event] as const),
      ),
    [],
  )

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hover])

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
        feed.lenses.reduce((max, lens) => Math.max(max, lens.redshift), 0),
        feed.sne.reduce((max, sn) => Math.max(max, sn.redshift), 0),
      ),
    [feed],
  )

  const lensCount = live ? feed.lenses.length : LENS_TOTAL
  const sneCount = live ? feed.sne.length : SNE_TOTAL
  const hoveredSne = hover ? feed.sne[hover.index] : null
  const hoveredMeta = hoveredSne
    ? sneMeta.get(normalizeName(hoveredSne.name))
    : null

  return (
    <div className="lens-scatter-wrap">
      <div className="lens-scatter">
        <div
          className="lens-scatter__canvas"
          role="img"
          aria-label="Three-dimensional scatter map of 13,941 known gravitational lenses in blue and five sampled lensed supernovae in gold."
        >
          <Canvas
            camera={{ position: [23, 15, 26], fov: 42 }}
            dpr={[1, 2]}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
            onPointerMissed={() => setHover(null)}
          >
            <ResponsiveFraming />
            <LensCloud lenses={feed.lenses} maxZ={maxZ} />
            <SneMarkers
              sne={feed.sne}
              maxZ={maxZ}
              hoveredIndex={hover?.index ?? null}
              onHover={setHover}
            />
            <gridHelper
              args={[24, 24, '#222222', '#222222']}
              position={[0, -10, 0]}
            >
              <lineBasicMaterial
                attach="material"
                color="#222222"
                transparent
                opacity={0.2}
              />
            </gridHelper>
            <OrbitControls
              enablePan={false}
              minDistance={14}
              maxDistance={56}
              target={[0, 0, 0]}
              autoRotate
              autoRotateSpeed={0.16}
            />
          </Canvas>
        </div>

        {hover && hoveredSne ? (
          <div
            className="lens-scatter__tooltip"
            style={{ left: hover.x, top: hover.y }}
            role="status"
            aria-live="polite"
          >
            <strong>{hoveredSne.name.replace(/_/g, ' ')}</strong>
            <span>Redshift z = {hoveredSne.redshift.toFixed(3)}</span>
            {hoveredMeta ? (
              <span>Magnification μ = {hoveredMeta.magnification.toFixed(1)}×</span>
            ) : null}
          </div>
        ) : null}

        <div className="lens-scatter__hud">
          <div
            className="lens-scatter__legend"
            role="group"
            aria-label="Map legend"
          >
            <span className="lens-scatter__key">
              <i
                className="lens-scatter__dot lens-scatter__dot--lens"
                aria-hidden="true"
              />
              {lensCount.toLocaleString()} Lenses
            </span>
            <span className="lens-scatter__key">
              <i
                className="lens-scatter__dot lens-scatter__dot--sne"
                aria-hidden="true"
              />
              {sneCount} Supernovae
            </span>
          </div>
        </div>

        <p className="lens-scatter__hint">Drag to rotate · scroll to zoom</p>
      </div>

      <p className="lens-scatter__caption">
        Only {sneCount} of {lensCount.toLocaleString()} known lenses line up
        closely enough with a supernova — and even then, only those with extreme
        magnification clear our detection limits. Hover or tap a gold point for
        its redshift and magnification.
      </p>
    </div>
  )
}
