import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from 'react'
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

interface CandidateMeta {
  name: string
  partner: string
  pairIndex: number
  dm: number
  ra: number
  dec: number
  dmDiff: number
  timeDiffDays: number
}

interface HoveredCandidate {
  meta: CandidateMeta
  position: Vec3
}

interface CloudData {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  phases: Float32Array
  candidatePositions: Float32Array
  candidateMeta: CandidateMeta[]
  pairLines: Vec3[][]
  total: number
  candidateCount: number
  pairCount: number
  dmMin: number
  dmMax: number
}

const SPHERE_RADIUS = 10

/*
 * A cold deep-space ramp: slate blue at low DM, steel blue through the
 * middle, ice-white at the highest DM. Keeping every background burst
 * inside the blue family is what lets the four gold candidates own the only
 * warm colour on the chart (the old violet→gold Viridis ramp made high-DM
 * background points compete with the candidates).
 */
const DM_RAMP: [number, number, number][] = [
  [0.43, 0.55, 0.7], // #6e8cb3
  [0.5, 0.66, 0.81], // #80a8cf
  [0.58, 0.76, 0.88], // #94c2e0
  [0.68, 0.84, 0.94], // #add6f0
  [0.8, 0.91, 0.98], // #cce8fa
  [0.94, 0.98, 1.0], // #f0faff
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
  return (value - Math.floor(value) - 0.5) * 0.22
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

    // CSS-pixel sizes, not world units. 2.2–3.3 px reads as a bright grain
    // of star dust instead of a soft noise mote, while still letting SNR
    // add a little weight.
    const snrRatio = Math.max(0, row.snr ?? 0) / maxSnr
    sizes[index] = 2.2 + snrRatio * 1.1
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
      pairLines.push([
        toSphere(first, dmMax, SPHERE_RADIUS, 0.04),
        toSphere(second, dmMax, SPHERE_RADIUS, 0.04),
      ])
    }
  }

  const candidatePositions = new Float32Array(candidateRows.length * 3)
  candidateRows.forEach((row, index) => {
    const [x, y, z] = toSphere(row, dmMax, SPHERE_RADIUS, 0.04)
    candidatePositions[index * 3] = x
    candidatePositions[index * 3 + 1] = y
    candidatePositions[index * 3 + 2] = z
  })

  const partnerByName = new Map<
    string,
    {
      partner: string
      pairIndex: number
      dmDiff: number
      timeDiffDays: number
    }
  >()
  data.candidates.forEach((pair, pairIndex) => {
    const shared = {
      pairIndex,
      dmDiff: pair.dm_diff,
      timeDiffDays: pair.time_diff_days,
    }
    partnerByName.set(pair.frb1, { partner: pair.frb2, ...shared })
    partnerByName.set(pair.frb2, { partner: pair.frb1, ...shared })
  })

  const candidateMeta = candidateRows.map<CandidateMeta>((row) => {
    const info = partnerByName.get(row.frb_name)
    return {
      name: row.frb_name,
      partner: info?.partner ?? '',
      pairIndex: info?.pairIndex ?? 0,
      dm: row.dm,
      ra: row.ra,
      dec: row.dec,
      dmDiff: info?.dmDiff ?? 0,
      timeDiffDays: info?.timeDiffDays ?? 0,
    }
  })

  return {
    positions,
    colors,
    sizes,
    phases,
    candidatePositions,
    candidateMeta,
    pairLines,
    total: rows.length,
    candidateCount: candidateRows.length,
    pairCount: data.candidates.length,
    dmMin,
    dmMax,
  }
}

/*
 * Point size is expressed in CSS pixels and multiplied by the renderer's
 * device pixel ratio. That keeps every mote exactly 1.25–2.1 CSS px wide
 * (and therefore pin-sharp on retina) instead of growing into a soft disc.
 */
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
    vTwinkle = 0.86 + 0.14 * sin(uTime * 1.9 + aPhase);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Only a slight depth cue. A strong perspective multiplier was the
    // main reason the foreground half of the catalogue turned into blobs.
    float depthScale = clamp(18.0 / max(-mvPosition.z, 1.0), 0.74, 1.16);
    gl_PointSize = clamp(
      aSize * uDpr * depthScale,
      1.0 * uDpr,
      4.0 * uDpr
    );
    gl_Position = projectionMatrix * mvPosition;
  }
`

const POINT_FRAGMENT = `
  varying vec3 vColor;
  varying float vTwinkle;
  uniform float uOpacity;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;

    // A single antialiased step. No halo, no additive bloom: these are dust
    // grains, not little lamps.
    float edge = smoothstep(1.0, 0.76, d);
    float alpha = edge * uOpacity * vTwinkle;
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(vColor, alpha);
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
          uOpacity: { value: 0.65 },
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

const CANDIDATE_VERTEX = `
  uniform float uDpr;
  uniform float uSize;
  uniform float uTime;
  varying float vPulse;

  void main() {
    float pulse = 1.0 + 0.05 * sin(uTime * 2.1 + position.x);
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
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;

    // No outline, no ring. A compact white-gold core with a bright radial
    // falloff: the supernova is found by its own glow, never by a drawn
    // circle around it.
    float core = 1.0 - smoothstep(0.0, 0.26, d);
    float falloff = 1.0 - smoothstep(0.0, 1.0, d);
    float halo = pow(falloff, 1.35) * 0.72;
    float inner = pow(falloff, 3.0) * 0.22;

    vec3 color = mix(uColor, vec3(1.0, 0.985, 0.92), core * 0.8);
    float alpha = clamp(core + halo + inner, 0.0, 1.0) * vPulse;

    gl_FragColor = vec4(color, alpha);
  }
`

const HOVER_VERTEX = `
  uniform float uDpr;
  uniform float uSize;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uDpr;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const HOVER_FRAGMENT = `
  uniform float uTime;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
    if (d > 1.0) discard;

    // Hover feedback is also a clean halo — deliberately no ring or ticks.
    float falloff = 1.0 - smoothstep(0.0, 1.0, d);
    float pulse = 0.8 + 0.2 * sin(uTime * 2.4);
    float alpha = pow(falloff, 2.0) * 0.3 * pulse;

    gl_FragColor = vec4(1.0, 0.82, 0.34, alpha);
  }
`

function GoldCandidates({
  cloud,
  onHover,
  onHoverEnd,
}: {
  cloud: CloudData
  onHover: (hovered: HoveredCandidate) => void
  onHoverEnd: () => void
}) {
  const dpr = useThree((state) => state.viewport.dpr)
  const raycaster = useThree((state) => state.raycaster)
  const camera = useThree((state) => state.camera)
  const gl = useThree((state) => state.gl)
  const material = useRef<THREE.ShaderMaterial>(null)
  const hoverMaterial = useRef<THREE.ShaderMaterial>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  useEffect(() => {
    const pointsParams = raycaster.params.Points
    const previous = pointsParams?.threshold ?? 1
    gl.domElement.style.cursor = 'grab'

    return () => {
      if (pointsParams) pointsParams.threshold = previous
      gl.domElement.style.cursor = ''
    }
  }, [raycaster, gl])

  useFrame(({ clock }) => {
    const time = clock.elapsedTime
    if (material.current) material.current.uniforms.uTime.value = time
    if (hoverMaterial.current) {
      hoverMaterial.current.uniforms.uTime.value = time
    }

    // Keep the hit radius at roughly 15 screen px. A fixed world-space
    // threshold becomes an enormous invisible target once the user zooms
    // in, which is exactly what makes tooltips jump in empty space.
    const pointsParams = raycaster.params.Points
    if (pointsParams) {
      pointsParams.threshold = THREE.MathUtils.clamp(
        camera.position.length() * 0.016,
        0.14,
        0.42,
      )
    }
  })

  if (cloud.candidatePositions.length === 0) return null

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation()
    if (typeof event.index !== 'number') return

    const meta = cloud.candidateMeta[event.index]
    if (!meta) return

    const offset = event.index * 3
    setActiveIndex(event.index)
    onHover({
      meta,
      position: [
        cloud.candidatePositions[offset],
        cloud.candidatePositions[offset + 1],
        cloud.candidatePositions[offset + 2],
      ],
    })
  }

  function handlePointerOver() {
    gl.domElement.style.cursor = 'pointer'
  }

  function handlePointerOut() {
    gl.domElement.style.cursor = 'grab'
    setActiveIndex(null)
    onHoverEnd()
  }

  const activePosition: Vec3 | null =
    activeIndex !== null
      ? [
          cloud.candidatePositions[activeIndex * 3],
          cloud.candidatePositions[activeIndex * 3 + 1],
          cloud.candidatePositions[activeIndex * 3 + 2],
        ]
      : null

  // bufferAttribute wants a typed array; the Vec3 above is only used for
  // the Math and for the hovered-state payload.
  const activeBuffer = activePosition
    ? new Float32Array(activePosition)
    : null

  return (
    <>
      <points
        frustumCulled={false}
        renderOrder={6}
        onPointerMove={handlePointerMove}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
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
            uSize: { value: 24 },
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

      {activePosition && activeBuffer ? (
        <points frustumCulled={false} renderOrder={7}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[activeBuffer, 3]}
            />
          </bufferGeometry>
          <shaderMaterial
            ref={hoverMaterial}
            uniforms={{
              uDpr: { value: dpr },
              uSize: { value: 50 },
              uTime: { value: 0 },
            }}
            vertexShader={HOVER_VERTEX}
            fragmentShader={HOVER_FRAGMENT}
            transparent
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </points>
      ) : null}

      {cloud.pairLines.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#ffd700"
          lineWidth={0.7}
          transparent
          opacity={0.28}
          depthWrite={false}
          depthTest={false}
        />
      ))}
    </>
  )
}

/**
 * A barely-there celestial cage: one wireframe shell plus three great
 * circles. It gives the cloud an edge without competing with the data.
 */
function CelestialFrame() {
  const rings = useMemo(() => {
    const steps = 96
    const radius = SPHERE_RADIUS + 0.3
    const ring = (axis: 'xy' | 'xz' | 'yz') =>
      Array.from({ length: steps + 1 }, (_, index) => {
        const angle = (index / steps) * Math.PI * 2
        const a = Math.cos(angle) * radius
        const b = Math.sin(angle) * radius
        return axis === 'xy'
          ? ([a, b, 0] as Vec3)
          : axis === 'xz'
            ? ([a, 0, b] as Vec3)
            : ([0, a, b] as Vec3)
      })

    return [ring('xy'), ring('xz'), ring('yz')]
  }, [])

  return (
    <>
      <mesh renderOrder={-2}>
        <sphereGeometry args={[SPHERE_RADIUS + 0.6, 32, 18]} />
        <meshBasicMaterial
          color="#1e3a8a"
          wireframe
          transparent
          opacity={0.035}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {rings.map((points, index) => (
        <Line
          key={index}
          points={points}
          color="#3f74d6"
          lineWidth={index === 0 ? 0.55 : 0.4}
          transparent
          opacity={index === 0 ? 0.24 : 0.14}
          depthWrite={false}
        />
      ))}
    </>
  )
}

interface TooltipSize {
  width: number
  height: number
}

/**
 * Places the HTML tooltip in screen space every frame (so it follows orbit
 * and zoom), flipping it away from the hovered star and clamping it inside
 * the HUD frame. `data-side` drives the little connector line in CSS.
 */
function TooltipPlacer({
  hovered,
  tooltipRef,
  sizeRef,
}: {
  hovered: HoveredCandidate | null
  tooltipRef: RefObject<HTMLDivElement | null>
  sizeRef: RefObject<TooltipSize>
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const point = useRef(new THREE.Vector3())
  const viewDirection = useRef(new THREE.Vector3())

  useFrame(() => {
    const element = tooltipRef.current
    if (!element || !hovered) return

    point.current.set(...hovered.position)
    camera.getWorldDirection(viewDirection.current)

    const facing =
      (point.current.x - camera.position.x) * viewDirection.current.x +
      (point.current.y - camera.position.y) * viewDirection.current.y +
      (point.current.z - camera.position.z) * viewDirection.current.z

    if (facing <= 0) {
      element.style.visibility = 'hidden'
      element.style.opacity = '0'
      return
    }

    point.current.project(camera)

    const anchorX = (point.current.x * 0.5 + 0.5) * size.width
    const anchorY = (-point.current.y * 0.5 + 0.5) * size.height

    const measured = sizeRef.current
    const tooltipWidth = measured.width || 220
    const tooltipHeight = measured.height || 96
    const margin = 12
    const gap = 18

    const fitsLeft = anchorX - gap - margin >= tooltipWidth
    const fitsRight =
      size.width - anchorX - gap - margin >= tooltipWidth
    const fitsHorizontally = fitsLeft || fitsRight

    let side: 'left' | 'right' | 'above' | 'below'
    let left: number
    let top: number

    if (fitsHorizontally) {
      // Opposite side of the chart: a star on the right gets its card on
      // the left, so the card can never sit on top of the point being read.
      if (anchorX > size.width / 2) {
        side = 'left'
        left = anchorX - gap - tooltipWidth
      } else {
        side = 'right'
        left = anchorX + gap
      }
      top = anchorY - tooltipHeight / 2
    } else {
      // Narrow canvases cannot fit a card beside the star; place it above
      // or below and keep it horizontally centred, still inside the frame.
      side = anchorY > size.height / 2 ? 'above' : 'below'
      left = anchorX - tooltipWidth / 2
      top =
        side === 'above'
          ? anchorY - gap - tooltipHeight
          : anchorY + gap
    }

    const maxLeft = Math.max(margin, size.width - tooltipWidth - margin)
    const maxTop = Math.max(margin, size.height - tooltipHeight - margin)
    left = Math.min(Math.max(margin, left), maxLeft)
    top = Math.min(Math.max(margin, top), maxTop)

    element.dataset.side = side
    element.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(
      top,
    )}px, 0)`
    element.style.visibility = 'visible'
    element.style.opacity = '1'
  })

  return null
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
  const [hovered, setHovered] = useState<HoveredCandidate | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipSizeRef = useRef<TooltipSize>({ width: 0, height: 0 })
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)

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

  // Measure once per hovered card (and on resize), then let the frame loop
  // use the cached size rather than forcing a layout read 60 times a second.
  useLayoutEffect(() => {
    const element = tooltipRef.current
    if (!element) return

    const measure = () => {
      tooltipSizeRef.current = {
        width: element.offsetWidth,
        height: element.offsetHeight,
      }
    }
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [hovered])

  const handleHover = useCallback((next: HoveredCandidate) => {
    setHovered((current) =>
      current?.meta.name === next.meta.name ? current : next,
    )
  }, [])

  const handleHoverEnd = useCallback(() => setHovered(null), [])

  const zoomBy = useCallback((factor: number) => {
    const controls = controlsRef.current
    if (!controls) return
    const camera = controls.object
    const offset = camera.position.clone().sub(controls.target)
    const distance = offset.length()
    const nextDistance = THREE.MathUtils.clamp(
      distance * factor,
      controls.minDistance,
      controls.maxDistance,
    )
    if (Math.abs(nextDistance - distance) < 0.01) return
    offset.setLength(nextDistance)
    camera.position.copy(controls.target).add(offset)
    controls.update()
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
      <p className="frb-map__hover-hint">
        <span className="frb-map__hover-hint-dot" aria-hidden="true" />
        Hover one of the four gold candidate stars
      </p>

      <div className="frb-map__canvas">
        <Canvas
          camera={{ position: [18, 10, 20], fov: 42, near: 0.1, far: 200 }}
          dpr={[2, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          style={{ background: 'transparent' }}
          role="img"
          aria-label={`Spherical 3D scatter plot of ${cloud.total} fast radio bursts. Each burst is placed by right ascension and declination, with radius set by dispersion measure and color following a deep-blue-to-ice dispersion-measure scale. Four candidate FRB signals, forming two pairs, are highlighted as gold stars; hover one to read its name, dispersion measure and pair delay. Drag to orbit and scroll to zoom.`}
          onPointerMissed={handleHoverEnd}
        >
          <ResponsiveCamera />
          <CelestialFrame />
          <FrbPoints cloud={cloud} />
          <GoldCandidates
            cloud={cloud}
            onHover={handleHover}
            onHoverEnd={handleHoverEnd}
          />
          <TooltipPlacer
            hovered={hovered}
            tooltipRef={tooltipRef}
            sizeRef={tooltipSizeRef}
          />
          {/* Origin stays the orbit pivot. zoomToCursor is deliberately off:
              it moves the target and lets the cluster drift out of frame. */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            target={[0, 0, 0]}
            enablePan={false}
            enableZoom
            zoomSpeed={0.9}
            minDistance={14}
            maxDistance={34}
            minPolarAngle={Math.PI / 12}
            maxPolarAngle={Math.PI - Math.PI / 12}
            minAzimuthAngle={-Math.PI}
            maxAzimuthAngle={Math.PI}
            enableDamping
            dampingFactor={0.06}
            rotateSpeed={0.5}
          />
        </Canvas>

        <div className="frb-map__hud" aria-hidden="true">
          <span className="frb-map__hud-item frb-map__hud-item--tl">
            FRB / 3D SKY
          </span>
          <span className="frb-map__hud-item frb-map__hud-item--tr">
            {cloud.total} EVENTS
          </span>
          <span className="frb-map__hud-item frb-map__hud-item--bl">
            RA 0h — 24h
          </span>
          <span className="frb-map__hud-item frb-map__hud-item--br">
            DEC −90° → +90°
          </span>
        </div>

        <div className="frb-map__zoom" role="group" aria-label="Chart zoom">
          <button
            type="button"
            onClick={() => zoomBy(0.8)}
            aria-label="Zoom in"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            aria-label="Zoom out"
            title="Zoom out"
          >
            −
          </button>
        </div>

        {hovered ? (
          <div
            ref={tooltipRef}
            className="frb-map__tooltip"
            data-side="right"
            role="status"
            aria-live="polite"
          >
            <span className="frb-map__tooltip-kicker">
              Candidate FRB · Pair{' '}
              {String(hovered.meta.pairIndex + 1).padStart(2, '0')}
            </span>
            <strong className="frb-map__tooltip-name">
              {hovered.meta.name}
            </strong>
            <span className="frb-map__tooltip-row">
              <span className="frb-map__tooltip-label">DM</span>
              <span className="frb-map__tooltip-value">
                {formatDm(hovered.meta.dm)} pc cm⁻³
              </span>
            </span>
            <span className="frb-map__tooltip-row">
              <span className="frb-map__tooltip-label">Echo</span>
              <span className="frb-map__tooltip-value">
                Δt {hovered.meta.timeDiffDays.toFixed(1)} d · ΔDM{' '}
                {hovered.meta.dmDiff.toFixed(1)}
              </span>
            </span>
            {hovered.meta.partner ? (
              <span className="frb-map__tooltip-pair">
                Paired with {hovered.meta.partner}
              </span>
            ) : null}
          </div>
        ) : null}

        <p className="frb-map__canvas-hint">
          Drag to orbit · Scroll to zoom · Hover a gold star
        </p>
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
            ({cloud.candidateCount} signals · {cloud.pairCount} pairs)
          </b>
        </span>
      </div>

      <p className="frb-map__hint">
        {cloud.total} FRBs with complete DM data plotted
      </p>
      <p className="frb-map__axes">
        r = DM / max(DM) · RA, Dec → direction · hover a gold candidate for its
        FRB name
      </p>
    </div>
  )
}
