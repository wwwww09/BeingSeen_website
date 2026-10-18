'use client'

import { PALETTE } from '@/lib/palette'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, Html, OrbitControls } from '@react-three/drei'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { LensPoint, SupernovaEvent } from '@/lib/types'
import { usePrefersReducedMotion } from '@/components/three/reducedMotion'

/**
 * 网页布局纲要 页面二 的「可选 3D 图」:
 *   lenscat 透镜系统 vs 真实 gISNe 的 3D 空间分布。
 *
 * 天球上每一个蓝点都是一个**已知**的引力透镜系统 (来自 lenscat 星表)。
 * 金色的五颗是**真的被观测到**的透镜超新星 —— 在整个星表里的比例是
 * 32,838 : 5。这张图想说明的正是这个悬殊的比例: 透镜很多,
 * 亮到能被看见的极少。
 *
 * 渲染要点 (沿用 ParticleField / FrbSkyMap 的做法):
 * - 4000 个点一次性写进 Float32Array, 每帧只旋转 group, 不做逐点运算
 * - 每颗 gISNe 用一个透明的大球做点击热区, 避免小目标点不中
 */

const R = 30

/** 赤道坐标 -> 3D 笛卡尔位置 */
function raDecToXyz(
  raDeg: number,
  decDeg: number,
  radius: number,
): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  const cosDec = Math.cos(dec)
  return [
    radius * cosDec * Math.cos(ra),
    radius * Math.sin(dec),
    radius * cosDec * Math.sin(ra),
  ]
}

/** 红移 -> 颜色: 蓝 (近) 渐变到 橙红 (远); 没有红移的用暗蓝灰 */
function redshiftColor(z: number | null, out: THREE.Color): THREE.Color {
  if (z === null || !Number.isFinite(z)) return out.set(PALETTE.borderBright)
  const t = Math.min(1, Math.max(0, z / 1.5))
  return out.setHSL(0.6 - 0.52 * t, 0.78, 0.46 + 0.14 * t)
}

function LensCloud({ lenses }: { lenses: LensPoint[] }) {
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(lenses.length * 3)
    const colors = new Float32Array(lenses.length * 3)
    const c = new THREE.Color()
    lenses.forEach((l, i) => {
      const [x, y, z] = raDecToXyz(l.ra, l.dec, R)
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      redshiftColor(l.z, c)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    })
    return { positions, colors }
  }, [lenses])

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.26}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function GisneMarkers({
  events,
  selected,
  onSelect,
}: {
  events: SupernovaEvent[]
  selected: number | null
  onSelect: (i: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <group>
      {events.map((e, i) => {
        const pos = raDecToXyz(e.ra, e.dec, R)
        const active = selected === i
        const hot = hovered === i
        const show = active || hot

        return (
          <group key={e.name} position={pos}>
            {/* 点击热区: 完全透明但可被射线命中 */}
            <mesh
              onPointerOver={(ev) => {
                ev.stopPropagation()
                setHovered(i)
              }}
              onPointerOut={() => setHovered((h) => (h === i ? null : h))}
              onClick={(ev) => {
                ev.stopPropagation()
                onSelect(i)
              }}
            >
              <sphereGeometry args={[1.6, 10, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* 光晕 */}
            <mesh scale={active ? 1.6 : hot ? 1.3 : 1}>
              <sphereGeometry args={[0.85, 14, 10]} />
              <meshBasicMaterial
                color={PALETTE.goldSoft}
                transparent
                opacity={active ? 0.32 : 0.16}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* 本体 */}
            <mesh scale={active ? 1.4 : 1}>
              <sphereGeometry args={[0.42, 16, 12]} />
              <meshBasicMaterial
                color={active ? PALETTE.text : PALETTE.goldSoft}
                toneMapped={false}
              />
            </mesh>

            {show && (
              <Html
                distanceFactor={26}
                style={{
                  color: 'var(--gold-soft)',
                  fontSize: '11.5px',
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  textShadow: '0 0 6px #000, 0 0 3px #000',
                  pointerEvents: 'none',
                  transform: 'translateY(-20px)',
                }}
              >
                {e.name}
                <br />
                <span style={{ fontWeight: 500, fontSize: '10.5px' }}>
                  z = {e.redshift.toFixed(2)} · μ = {e.magnification.toFixed(1)}×
                </span>
              </Html>
            )}
          </group>
        )
      })}
    </group>
  )
}

/**
 * 缓慢自转的天球。
 *
 * 注意: useFrame 必须由 <Canvas> **内部**的组件调用。
 * 如果在渲染 <Canvas> 的那个组件里调用, R3F 会抛
 * "Hooks can only be used within the Canvas component!" 并且整页崩掉 ——
 * 这个错误 TypeScript 和 next build 都发现不了, 只有真正打开页面才会暴露。
 */
function RotatingSky({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const reducedMotion = usePrefersReducedMotion()

  useFrame((_, delta) => {
    if (reducedMotion) return
    if (group.current) group.current.rotation.y += delta * 0.02
  })

  return <group ref={group}>{children}</group>
}

export default function LensCatalogScene({
  lenses,
  events,
  selected,
  onSelect,
}: {
  lenses: LensPoint[]
  events: SupernovaEvent[]
  selected: number | null
  onSelect: (i: number) => void
}) {
  const [dpr, setDpr] = useState(1.4)

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 46, near: 0.1, far: 400, position: [0, 16, 66] }}
    >
      <color attach="background" args={[PALETTE.bgVoid]} />
      <AdaptiveDpr pixelated />
      <ambientLight intensity={1} />
      <OrbitControls
        enablePan={false}
        minDistance={12}
        maxDistance={130}
        enableDamping
        dampingFactor={0.08}
      />

      <RotatingSky>
        {/* 参考天球, 给一点空间体量感 */}
        <mesh>
          <sphereGeometry args={[R, 36, 24]} />
          <meshBasicMaterial
            color={PALETTE.border}
            wireframe
            transparent
            opacity={0.05}
          />
        </mesh>

        <LensCloud lenses={lenses} />
        <GisneMarkers events={events} selected={selected} onSelect={onSelect} />

        {/* 只作为一个方位参照 */}
        <mesh>
          <sphereGeometry args={[0.5, 16, 12]} />
          <meshBasicMaterial color={PALETTE.textDim} transparent opacity={0.5} />
        </mesh>
      </RotatingSky>
    </Canvas>
  )
}
