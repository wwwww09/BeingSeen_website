'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { PALETTE } from '@/lib/palette'
import { useFilmProgressRef } from '@/components/film/scroll'
import { usePrefersReducedMotion } from '@/components/three/reducedMotion'
import { getLenses, getFrbs } from '@/lib/data'

/* ==========================================================================
   五幕电影的开场画面

   镜头按滚动进度推进:
     0%   全景星场，缓慢自转
     30%  推近到一颗暗星，它坍缩成黑洞（内部限制）
     60%  拉远，星点重排成 FRB 的三维散点（时间错位）
     80%  一个巨大星系进入前景，光被弯成爱因斯坦环（外部遮蔽）
     100% 回到宏观视角，暗区等待被点亮（人文连接 / 留言板）
   ========================================================================== */

/** 进度窗口: 在 [a,b] 内从 0 升到 1，再在 [b,c] 内降回 0 */
function band(p: number, a: number, b: number, c: number) {
  if (p <= a || p >= c) return 0
  if (p < b) return (p - a) / (b - a)
  return 1 - (p - b) / (c - b)
}

/**
 * 圆形柔化点贴图。
 * three.js 的 PointsMaterial 默认把每个点画成**方块** —— 放大之后就是一片
 * 小方块, 完全不像星星。这里用一张径向渐变贴图把它变成柔软的光点。
 * 只生成一次, 之后所有点云共用。
 */
let DOT: THREE.CanvasTexture | null = null
function dotTexture() {
  if (DOT) return DOT
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  DOT = new THREE.CanvasTexture(c)
  DOT.needsUpdate = true
  return DOT
}

/** 光晕贴图: 中心透明、向外先亮后淡的环形渐变 */
let GLOW: THREE.CanvasTexture | null = null
function glowTexture() {
  if (GLOW) return GLOW
  const n = 256
  const c = document.createElement('canvas')
  c.width = c.height = n
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
  g.addColorStop(0.0, 'rgba(255,255,255,0)')
  g.addColorStop(0.34, 'rgba(255,255,255,0)')
  g.addColorStop(0.42, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.18)')
  g.addColorStop(1.0, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, n, n)
  GLOW = new THREE.CanvasTexture(c)
  GLOW.needsUpdate = true
  return GLOW
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const smooth = (t: number) => t * t * (3 - 2 * t)

/** ra/dec(度) -> 单位球坐标 */
function skyToXYZ(raDeg: number, decDeg: number, r: number) {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  return [
    r * Math.cos(dec) * Math.cos(ra),
    r * Math.sin(dec),
    r * Math.cos(dec) * Math.sin(ra),
  ] as [number, number, number]
}

/* ---------------------------------------------------------------- 背景星场 */
function Starfield() {
  const group = useRef<THREE.Group>(null)
  const progress = useFilmProgressRef()
  const reduced = usePrefersReducedMotion()
  const { lenses } = getLenses()

  const positions = useMemo(() => {
    const sample = lenses.sample
    const arr = new Float32Array(sample.length * 3)
    sample.forEach((l, i) => {
      const [x, y, z] = skyToXYZ(l.ra, l.dec, 42)
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    })
    return arr
  }, [lenses.sample])

  const mat = useRef<THREE.PointsMaterial>(null)

  useFrame((_, dt) => {
    const p = progress.current
    if (group.current && !reduced) {
      group.current.rotation.y += dt * 0.014
    }
    if (group.current) {
      // 第二幕推近时星场让开，第四幕后重新回来
      const s = 1 + band(p, 0.16, 0.34, 0.5) * 0.08
      group.current.scale.setScalar(s)
    }
    if (mat.current) {
      // 第一幕最亮；黑洞特写时压暗，让画面几乎全黑
      const dim = band(p, 0.22, 0.3, 0.38)
      mat.current.opacity = 0.9 - dim * 0.75
    }
  })

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={mat}
          size={0.34}
          map={dotTexture()}
          color={PALETTE.accentBright}
          sizeAttenuation
          transparent
          opacity={0.75}
          depthWrite={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/* ---------------------------------------------------------------- 第二幕: 黑洞 */
function BlackHole() {
  const group = useRef<THREE.Group>(null)
  const billboard = useRef<THREE.Group>(null)
  const photon = useRef<THREE.Mesh>(null)
  const halo = useRef<THREE.Mesh>(null)
  const progress = useFilmProgressRef()
  const camera = useThree((s) => s.camera)

  useFrame(() => {
    const p = progress.current
    const a = band(p, 0.2, 0.3, 0.38)
    if (!group.current) return
    group.current.visible = a > 0.01
    group.current.scale.setScalar(0.5 + a * 0.45)
    // 环和光晕始终正对相机, 否则转过去就成了一条线
    billboard.current?.quaternion.copy(camera.quaternion)
    const pm = photon.current?.material as THREE.MeshBasicMaterial | undefined
    const hm = halo.current?.material as THREE.MeshBasicMaterial | undefined
    if (pm) pm.opacity = a
    if (hm) hm.opacity = a * 0.55
  })

  return (
    <group ref={group} visible={false} position={[2.1, 0, 0]}>
      {/* 视界: 纯黑, 什么都不发 */}
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      <group ref={billboard}>
        {/* 光子环: 极细极亮的一圈, 这是黑洞唯一"看得见"的部分 */}
        <mesh ref={photon}>
          <ringGeometry args={[1.02, 1.065, 160]} />
          <meshBasicMaterial
            color={PALETTE.goldSoft}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* 柔光: 一张环形渐变的贴图, 让边缘有"光被弯折"的过渡 */}
        <mesh ref={halo}>
          <planeGeometry args={[5.6, 5.6]} />
          <meshBasicMaterial
            map={glowTexture()}
            color={PALETTE.gold}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}

/* ---------------------------------------------------------------- 第三幕: FRB */
function FrbField() {
  const group = useRef<THREE.Group>(null)
  const mat = useRef<THREE.PointsMaterial>(null)
  const progress = useFilmProgressRef()
  const { frbs } = getFrbs()

  const positions = useMemo(() => {
    const arr = new Float32Array(frbs.events.length * 3)
    const dms = frbs.events.map((e) => e.dm)
    const lo = Math.min(...dms)
    const hi = Math.max(...dms)
    frbs.events.forEach((e, i) => {
      // 半径由 DM 决定: DM 越大(越远)离中心越远 —— 就是"距离 vs 位置"的散点
      const t = hi > lo ? (e.dm - lo) / (hi - lo) : 0.5
      const r = 4 + t * 20
      const [x, y, z] = skyToXYZ(e.ra, e.dec, r)
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    })
    return arr
  }, [frbs.events])

  useFrame((_, dt) => {
    const p = progress.current
    const a = band(p, 0.42, 0.5, 0.58)
    if (!group.current) return
    group.current.visible = a > 0.01
    group.current.rotation.y += dt * 0.05
    if (mat.current) mat.current.opacity = a * 0.95
  })

  return (
    <group ref={group} visible={false} position={[-5.5, 0, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={mat}
          size={0.62}
          map={dotTexture()}
          color={PALETTE.goldSoft}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/* ---------------------------------------------------------------- 第四幕: 透镜 */
function Lens() {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const source = useRef<THREE.Mesh>(null)
  const progress = useFilmProgressRef()

  useFrame((_, dt) => {
    const p = progress.current
    const a = band(p, 0.62, 0.7, 0.78)
    if (!group.current) return
    group.current.visible = a > 0.01
    group.current.position.z = 4 - a * 1.5
    if (ring.current) {
      ring.current.rotation.z += dt * 0.12
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity = a * 0.85
    }
    if (source.current) {
      const m = source.current.material as THREE.MeshBasicMaterial
      m.opacity = a
      const s = 0.6 + a * 1.4
      source.current.scale.setScalar(s)
    }
  })

  return (
    <group ref={group} visible={false} position={[4.2, 0, 4]}>
      {/* 透镜星系本体: 暗, 只是个遮挡物 */}
      <mesh>
        <sphereGeometry args={[0.85, 40, 28]} />
        <meshBasicMaterial color={PALETTE.accentDeep} transparent opacity={0.55} />
      </mesh>
      {/* 爱因斯坦环 */}
      <mesh ref={ring}>
        <torusGeometry args={[1.9, 0.03, 12, 160]} />
        <meshBasicMaterial
          color={PALETTE.goldSoft}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* 被放大的背景超新星 */}
      <mesh ref={source} position={[1.9, 0, 0]}>
        <sphereGeometry args={[0.09, 18, 14]} />
        <meshBasicMaterial
          color={PALETTE.goldSoft}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/* ---------------------------------------------------------------- 第五幕: 暗星 */
function BoardField() {
  const group = useRef<THREE.Group>(null)
  const mat = useRef<THREE.PointsMaterial>(null)
  const progress = useFilmProgressRef()

  const positions = useMemo(() => {
    const n = 900
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      // 集中在高赤纬的暗区 (|y| 大), 故事星将来放在这里
      const ra = Math.random() * Math.PI * 2
      const y = 0.45 + Math.random() * 0.5
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      arr[i * 3] = 34 * r * Math.cos(ra)
      arr[i * 3 + 1] = 34 * y * (Math.random() > 0.5 ? 1 : -1)
      arr[i * 3 + 2] = 34 * r * Math.sin(ra)
    }
    return arr
  }, [])

  useFrame(() => {
    const p = progress.current
    const a = band(p, 0.84, 0.92, 1.1)
    if (!group.current) return
    group.current.visible = a > 0.01
    if (mat.current) mat.current.opacity = a * 0.5
  })

  return (
    <group ref={group} visible={false} position={[-5.5, 0, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={mat}
          size={0.24}
          map={dotTexture()}
          color={PALETTE.text}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

/* ---------------------------------------------------------------- 镜头 */
/*
 * 关键帧对齐到**幕心**: 五幕等分视口, 所以第 i 幕的中心在 (i + 0.5) / 5,
 * 也就是 0.1 / 0.3 / 0.5 / 0.7 / 0.9。
 * 一开始按 0.3/0.6/0.8 放, 结果镜头比文字慢半拍 —— 读第三幕时画面还是第二幕。
 */
const KEYS: { at: number; pos: [number, number, number]; look: [number, number, number] }[] = [
  { at: 0.1, pos: [0, 0, 26], look: [0, 0, 0] },
  { at: 0.3, pos: [0, 0.35, 4.6], look: [1.6, 0, 0] },
  { at: 0.5, pos: [0, 3.5, 30], look: [-4, 0, 0] },
  { at: 0.7, pos: [0, 1.2, 13], look: [3.4, 0, 4] },
  { at: 0.9, pos: [0, 6, 44], look: [0, 0, 0] },
]

function CameraRig() {
  const progress = useFilmProgressRef()
  const camera = useThree((s) => s.camera)
  const target = useRef(new THREE.Vector3())
  const pos = useRef(new THREE.Vector3(0, 0, 26))

  useFrame((_, dt) => {
    const p = clamp01(progress.current)
    let i = 0
    while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++
    const a = KEYS[i]
    const b = KEYS[i + 1]
    const t = smooth(clamp01((p - a.at) / (b.at - a.at || 1)))

    const px = a.pos[0] + (b.pos[0] - a.pos[0]) * t
    const py = a.pos[1] + (b.pos[1] - a.pos[1]) * t
    const pz = a.pos[2] + (b.pos[2] - a.pos[2]) * t
    const lx = a.look[0] + (b.look[0] - a.look[0]) * t
    const ly = a.look[1] + (b.look[1] - a.look[1]) * t
    const lz = a.look[2] + (b.look[2] - a.look[2]) * t

    // 缓慢跟随, 避免滚动时镜头抖动
    const k = 1 - Math.pow(0.0015, dt)
    pos.current.lerp(new THREE.Vector3(px, py, pz), k)
    target.current.lerp(new THREE.Vector3(lx, ly, lz), k)
    camera.position.copy(pos.current)
    camera.lookAt(target.current)
  })

  return null
}

/* ---------------------------------------------------------------- 出口 */
export default function FilmCanvas() {
  return (
    <Canvas
      dpr={[1, 1.8]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 52, near: 0.1, far: 400, position: [0, 0, 26] }}
    >
      <color attach="background" args={[PALETTE.bgVoid]} />
      <CameraRig />
      <Starfield />
      <BlackHole />
      <FrbField />
      <Lens />
      <BoardField />
    </Canvas>
  )
}
