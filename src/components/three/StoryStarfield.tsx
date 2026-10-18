'use client'

import { PALETTE } from '@/lib/palette'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, AdaptiveDpr } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '@/components/three/reducedMotion'
import { STAR_COUNT } from '@/lib/stars'

/**
 * Being Seen 的星图。
 *
 * 每颗暗星代表宇宙中一个"尚未被完全看见"的天体, 也代表一个还没被说出口的故事。
 * 点亮一颗星 = 留下一个故事。已有故事的星会持续发光。
 *
 * 用 InstancedMesh 渲染, 点击/悬停通过射线与实例求交定位到具体那颗星。
 */

/** 点选兜底半径 (NDC 单位, 1.0 = 半个屏幕宽) */
const PICK_RADIUS = 0.06

/** 指针位移超过这个像素数就当作"拖动星图", 不算点选 */
const CLICK_SLOP_PX = 6

/** 由索引生成稳定的伪随机方向 (避免每次渲染星星乱跳) */
function starDirection(i: number, total: number): [number, number, number] {
  // 斐波那契球面分布 —— 视觉上均匀
  const golden = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (i / (total - 1)) * 2
  const r = Math.sqrt(Math.max(0, 1 - y * y))
  const theta = golden * i
  const radius = 11 + ((i * 7919) % 100) / 100 * 5
  return [Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius]
}

function Stars({
  litIndices,
  selected,
  onSelect,
  interactive,
}: {
  litIndices: Set<number>
  selected: number | null
  onSelect: (i: number) => void
  interactive: boolean
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const { raycaster, gl, camera } = useThree()
  const [hovered, setHovered] = useState<number | null>(null)
  const reducedMotion = usePrefersReducedMotion()

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const color = useMemo(() => new THREE.Color(), [])

  const dirs = useMemo(
    () => Array.from({ length: STAR_COUNT }, (_, i) => starDirection(i, STAR_COUNT)),
    [],
  )

  // 写入实例矩阵与颜色
  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    for (let i = 0; i < STAR_COUNT; i++) {
      const [x, y, z] = dirs[i]
      const lit = litIndices.has(i)
      const isSel = selected === i
      const isHov = hovered === i
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(lit ? 0.115 : isHov || isSel ? 0.085 : 0.052)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      if (isSel) color.set(PALETTE.text)
      else if (lit) color.set(PALETTE.goldSoft)
      else if (isHov) color.set(PALETTE.accent)
      else color.set(PALETTE.borderBright)
      mesh.setColorAt(i, color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [dirs, litIndices, selected, hovered, dummy, color])

  // 点击 / 悬停
  useEffect(() => {
    const mesh = meshRef.current
    const canvas = gl.domElement
    if (!mesh || !canvas) return

    /** 精确射线求交 */
    const pickExact = (ndc: THREE.Vector2): number | null => {
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(mesh, false)
      return hits.length > 0 && hits[0].instanceId !== undefined
        ? hits[0].instanceId
        : null
    }

    /**
     * 兜底: 在屏幕空间里找最近的一颗星。
     *
     * 星星只有几个像素宽, 精确求交很容易点空 —— 而这恰恰是全站最重要的
     * 一次交互, 点不中就等于故事写不出来。这里把 320 颗星投影到 NDC,
     * 取半径 PICK_RADIUS 内最近的一颗。只在点击时算一次, 开销可忽略。
     */
    const pickNearest = (ndc: THREE.Vector2): number | null => {
      const g = group.current
      if (!g) return null
      const v = new THREE.Vector3()
      let best: number | null = null
      let bestDist = PICK_RADIUS
      for (let i = 0; i < STAR_COUNT; i++) {
        const [x, y, z] = dirs[i]
        v.set(x, y, z).applyMatrix4(g.matrixWorld).project(camera)
        // 在相机背后的点投影会翻转, 直接丢掉
        if (v.z > 1) continue
        const d = Math.hypot(v.x - ndc.x, v.y - ndc.y)
        if (d < bestDist) {
          bestDist = d
          best = i
        }
      }
      return best
    }

    const toNdc = (clientX: number, clientY: number): THREE.Vector2 => {
      const rect = canvas.getBoundingClientRect()
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1,
      )
    }

    const pick = (clientX: number, clientY: number): number | null => {
      const ndc = toNdc(clientX, clientY)
      return pickExact(ndc) ?? pickNearest(ndc)
    }

    // 拖动星图之后松手也会触发 click, 这里用位移把"旋转"和"点选"区分开
    let downX = 0
    let downY = 0

    const onDown = (ev: PointerEvent) => {
      downX = ev.clientX
      downY = ev.clientY
    }

    const onMove = (ev: PointerEvent) => {
      if (!interactive) return
      setHovered(pick(ev.clientX, ev.clientY))
    }

    const onClick = (ev: MouseEvent) => {
      if (!interactive) return
      const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY)
      if (moved > CLICK_SLOP_PX) return
      const i = pick(ev.clientX, ev.clientY)
      if (i !== null) onSelect(i)
    }

    const onLeave = () => setHovered(null)

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [raycaster, gl, camera, interactive, onSelect, dirs])

  useFrame((_, d) => {
    if (reducedMotion) return
    if (group.current) group.current.rotation.y += d * 0.022
  })

  return (
    <group ref={group}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, STAR_COUNT]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* 中央的微光, 给一个空间参照 */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshBasicMaterial color={PALETTE.borderBright} transparent opacity={0.5} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.85, 16, 12]} />
        <meshBasicMaterial color={PALETTE.border} transparent opacity={0.08} />
      </mesh>
    </group>
  )
}

export default function StoryStarfield({
  litIndices,
  selected,
  onSelect,
  interactive = true,
}: {
  litIndices: number[]
  selected: number | null
  onSelect: (i: number) => void
  interactive?: boolean
}) {
  const [dpr, setDpr] = useState(1.4)
  const lit = useMemo(() => new Set(litIndices), [litIndices])
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 52, position: [0, 1.5, 34] }}
    >
      <color attach="background" args={[PALETTE.bgVoid]} />
      <AdaptiveDpr pixelated />
      <ambientLight intensity={1} />
      <OrbitControls
        enablePan={false}
        minDistance={12}
        maxDistance={48}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.22}
        enabled={interactive}
      />
      <Stars
        litIndices={lit}
        selected={selected}
        onSelect={onSelect}
        interactive={interactive}
      />
    </Canvas>
  )
}
