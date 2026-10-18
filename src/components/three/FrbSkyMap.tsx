'use client'

import { PALETTE } from '@/lib/palette'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, AdaptiveDpr } from '@react-three/drei'
import { useMemo, useRef, useState, useEffect } from 'react'
import * as THREE from 'three'
import type { FrbEvent } from '@/lib/types'
import { usePrefersReducedMotion } from '@/components/three/reducedMotion'

/**
 * CHIME/FRB 全样本的 3D 空间分布。
 *
 * 编码方式 (与设计文档一致):
 *   - 方向 = 天球上的真实位置 (RA / Dec)
 *   - 半径 = 色散量 DM, 代表信号穿过的自由电子总柱密度, 也是距离的代理
 *   - 颜色 = DM (蓝 → 金)
 *   - 点大小 = 信噪比 SNR
 *   - 高亮的两个 = 干净的候选透镜对
 *
 * 性能: 用 InstancedMesh 一次绘制全部 536 个点, 而不是 536 个独立 mesh。
 */

const DM_MIN = 100
const DM_MAX = 1600
const R_MIN = 4.2
const R_MAX = 13.5

function raDecToXyz(raDeg: number, decDeg: number, r: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  return [
    r * Math.cos(dec) * Math.cos(ra),
    r * Math.sin(dec),
    r * Math.cos(dec) * Math.sin(ra),
  ]
}

function dmToRadius(dm: number) {
  const t = Math.min(1, Math.max(0, (dm - DM_MIN) / (DM_MAX - DM_MIN)))
  return R_MIN + t * (R_MAX - R_MIN)
}

/** 蓝 → 青 → 金 的连续色标 */
function dmToColor(dm: number, out: THREE.Color) {
  const t = Math.min(1, Math.max(0, (dm - DM_MIN) / (DM_MAX - DM_MIN)))
  if (t < 0.5) {
    out.setRGB(0.2 + t * 0.4, 0.55 + t * 0.4, 1.0 - t * 0.35)
  } else {
    const u = (t - 0.5) * 2
    out.setRGB(0.4 + u * 0.6, 0.95 - u * 0.25, 0.65 - u * 0.6)
  }
  return out
}

/** 天球参照网格 + 赤道环 */
function CelestialGrid() {
  const R = R_MAX * 0.72
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.018, 8, 128]} />
        <meshBasicMaterial color={PALETTE.border} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R, 28, 20]} />
        <meshBasicMaterial color={PALETTE.border} wireframe transparent opacity={0.07} />
      </mesh>
    </group>
  )
}

function FrbPoints({
  events,
  highlight,
  survivors,
  claimed,
}: {
  events: FrbEvent[]
  highlight: Set<string>
  survivors: Set<string>
  claimed: Set<string>
}) {
  const group = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const { raycaster, gl, camera } = useThree()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  // 高亮的单独渲染, 其余进 instanced mesh
  const ordinary = useMemo(
    () => events.filter((e) => !highlight.has(e.name)),
    [events, highlight],
  )
  const highlighted = useMemo(
    () => events.filter((e) => highlight.has(e.name)),
    [events, highlight],
  )

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const tmpColor = useMemo(() => new THREE.Color(), [])

  // 构建每个实例的位置 / 大小 / 颜色
  const built = useMemo(() => {
    return ordinary.map((e) => {
      const r = dmToRadius(e.dm)
      const pos = raDecToXyz(e.ra, e.dec, r)
      const snr = e.snr ?? 1
      const size = 0.06 + Math.min(1, snr / 60) * 0.12
      return { pos, size, color: dmToColor(e.dm, new THREE.Color()), name: e.name, event: e }
    })
  }, [ordinary])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    built.forEach((b, i) => {
      dummy.position.set(b.pos[0], b.pos[1], b.pos[2])
      dummy.scale.setScalar(b.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, b.color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [built, dummy])

  // 悬停检测: 用射线与 instanced mesh 求交
  useEffect(() => {
    const mesh = meshRef.current
    const canvas = gl.domElement
    if (!mesh || !canvas) return

    const onMove = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const ndc = new THREE.Vector2(
        ((ev.clientX - rect.left) / rect.width) * 2 - 1,
        -((ev.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(mesh, false)
      const id = hits.length > 0 ? hits[0].instanceId : undefined
      setHoveredIndex(id === undefined ? null : id)
    }
    const onLeave = () => setHoveredIndex(null)

    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [raycaster, gl, camera, built.length])

  useFrame((_, d) => {
    if (reducedMotion) return
    if (group.current) group.current.rotation.y += d * 0.045
  })

  const hovered = hoveredIndex !== null ? built[hoveredIndex] : null

  return (
    <group ref={group}>
      {/* 536 个点一次绘制 */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, built.length]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial transparent opacity={0.85} toneMapped={false} />
      </instancedMesh>

      {/* 高亮: 通过判据的 (金) 与 未通过判据的 (红), 单独渲染并带标签 */}
      {highlighted.map((e) => {
        const r = dmToRadius(e.dm)
        const pos = raDecToXyz(e.ra, e.dec, r)
        const passed = survivors.has(e.name)
        const color = passed ? PALETTE.gold : PALETTE.red
        return (
          <group key={e.name} position={pos}>
            <mesh>
              <sphereGeometry args={[0.19, 16, 12]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.44, 16, 12]} />
              <meshBasicMaterial color={color} transparent opacity={0.2} />
            </mesh>
            <Html
              distanceFactor={18}
              style={{
                color,
                fontSize: '11px',
                whiteSpace: 'nowrap',
                fontWeight: 700,
                textShadow: '0 0 6px #000, 0 0 3px #000',
                pointerEvents: 'none',
                transform: 'translateY(-14px)',
              }}
            >
              {e.name}
              <br />
              <span style={{ fontWeight: 500, fontSize: '10px' }}>
                {passed ? 'passes DM test' : 'fails DM test'}
              </span>
            </Html>
          </group>
        )
      })}
      {hovered && <HoverLabel payload={hovered} />}
    </group>
  )
}

function HoverLabel({
  payload,
}: {
  payload: { pos: [number, number, number]; name: string; event: FrbEvent }
}) {
  const { event } = payload
  return (
    <Html
      position={payload.pos}
      distanceFactor={18}
      style={{
        color: 'var(--text)',
        fontSize: '11px',
        whiteSpace: 'nowrap',
        background: 'rgba(6,9,20,0.9)',
        border: '1px solid var(--border-bright)',
        borderRadius: '6px',
        padding: '4px 7px',
        pointerEvents: 'none',
        transform: 'translateY(-22px)',
      }}
    >
      <strong>{event.name}</strong>
      <br />
      DM {event.dm.toFixed(1)} · SNR {event.snr?.toFixed(1) ?? '—'}
      <br />
      {event.isRepeater ? 'known repeater' : 'apparent non-repeater'}
    </Html>
  )
}

export default function FrbSkyMap({
  events,
  survivors,
  claimed,
}: {
  events: FrbEvent[]
  /** 通过严格判据的配对名 (金色高亮) */
  survivors: string[]
  /** 早期声称但未通过 DM 判据的配对名 (红色, 表示被否掉) */
  claimed: string[]
}) {
  const [dpr, setDpr] = useState(1.4)
  const [showRepeaters, setShowRepeaters] = useState(false)
  const reducedMotion = usePrefersReducedMotion()

  const survivorSet = useMemo(() => new Set(survivors), [survivors])
  const claimedSet = useMemo(() => new Set(claimed), [claimed])

  // 非重复暴进主点云, 重复暴可选显示
  const shown = useMemo(
    () => events.filter((e) => showRepeaters || !e.isRepeater),
    [events, showRepeaters],
  )
  const highlightSet = useMemo(
    () => new Set([...survivors, ...claimed]),
    [survivors, claimed],
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 50, position: [0, 9, 24] }}
      >
        <color attach="background" args={[PALETTE.bgVoid]} />
        <AdaptiveDpr pixelated />
        <ambientLight intensity={1} />
        <OrbitControls
          enablePan={false}
          minDistance={14}
          maxDistance={48}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.35}
        />
        <CelestialGrid />
        <FrbPoints
          events={shown}
          highlight={highlightSet}
          survivors={survivorSet}
          claimed={claimedSet}
        />

        <mesh>
          <sphereGeometry args={[0.16, 16, 12]} />
          <meshBasicMaterial color={PALETTE.textDim} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.32, 16, 12]} />
          <meshBasicMaterial color={PALETTE.textDim} transparent opacity={0.12} />
        </mesh>
      </Canvas>

      <div className="skymap__legend">
        <div className="skymap__legend-row">
          <span className="skymap__swatch" style={{ background: 'var(--accent)' }} />
          <span className="small">low DM</span>
          <span className="skymap__swatch" style={{ background: 'var(--gold)' }} />
          <span className="small">high DM</span>
        </div>
        <div className="skymap__legend-row small muted">
          radius = DM &nbsp;·&nbsp; size = SNR
        </div>
        <div className="skymap__legend-row">
          <span className="skymap__swatch" style={{ background: 'var(--gold)', borderRadius: '50%' }} />
          <span className="small">passes DM test</span>
        </div>
        <div className="skymap__legend-row">
          <span className="skymap__swatch" style={{ background: 'var(--red)', borderRadius: '50%' }} />
          <span className="small">fails DM test</span>
        </div>
      </div>

      <label className="skymap__toggle">
        <input
          type="checkbox"
          checked={showRepeaters}
          onChange={(e) => setShowRepeaters(e.target.checked)}
        />
        <span className="small">show {events.filter((e) => e.isRepeater).length} repeaters</span>
      </label>

      <div className="canvas-hint">drag to rotate · hover a burst for details</div>
    </div>
  )
}
