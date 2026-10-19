'use client'

import { PALETTE } from '@/lib/palette'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { LensPoint } from '@/lib/types'
import { usePrefersReducedMotion } from '@/components/three/reducedMotion'

/**
 * 首页背景星图。
 *
 * 性能要点 (依据调研结论):
 * - 位置一次性写入预分配的 Float32Array, 不在每帧的 JS 循环里重建
 * - 旋转只改 group 的矩阵, 不做逐点运算
 * - 限制 DPR 上限, 移动端自动降级
 */

/** 把赤道坐标转成 3D 笛卡尔位置 */
function raDecToXyz(raDeg: number, decDeg: number, radius: number): [number, number, number] {
  const ra = (raDeg * Math.PI) / 180
  const dec = (decDeg * Math.PI) / 180
  const x = radius * Math.cos(dec) * Math.cos(ra)
  const y = radius * Math.sin(dec)
  const z = radius * Math.cos(dec) * Math.sin(ra)
  return [x, y, z]
}

function LensedField({ lenses }: { lenses: LensPoint[] }) {
  const group = useRef<THREE.Group>(null)
  const reducedMotion = usePrefersReducedMotion()

  // 蓝色: 已知透镜系统
  const lensPositions = useMemo(() => {
    const arr = new Float32Array(lenses.length * 3)
    lenses.forEach((l, i) => {
      const [x, y, z] = raDecToXyz(l.ra, l.dec, 26)
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
    })
    return arr
  }, [lenses])

  // 金色: 未探测到的源, 随机散布在球壳内
  const sourcePositions = useMemo(() => {
    const count = 2600
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // 球面均匀采样
      const u = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const r = 14 + Math.random() * 16
      const s = Math.sqrt(1 - u * u)
      arr[i * 3] = r * s * Math.cos(theta)
      arr[i * 3 + 1] = r * u
      arr[i * 3 + 2] = r * s * Math.sin(theta)
    }
    return arr
  }, [])

  // 背景深空尘埃
  const dustPositions = useMemo(() => {
    const count = 4200
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1
      const theta = Math.random() * Math.PI * 2
      const r = 46 + Math.random() * 40
      const s = Math.sqrt(1 - u * u)
      arr[i * 3] = r * s * Math.cos(theta)
      arr[i * 3 + 1] = r * u
      arr[i * 3 + 2] = r * s * Math.sin(theta)
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (reducedMotion) return
    if (group.current) {
      group.current.rotation.y += delta * 0.028
      group.current.rotation.x = Math.sin(Date.now() * 0.00005) * 0.045
    }
  })

  return (
    <group ref={group}>
      {/* 已知透镜系统 */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[lensPositions, 3]}
            count={lensPositions.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          color={PALETTE.accent}
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 未探测到的源 */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[sourcePositions, 3]}
            count={sourcePositions.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.13}
          color={PALETTE.gold}
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 背景尘埃 */}
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustPositions, 3]}
            count={dustPositions.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          color={PALETTE.textFaint}
          transparent
          opacity={0.5}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  )
}

export default function ParticleField({ lenses }: { lenses: LensPoint[] }) {
  const [dpr, setDpr] = useState(1.4)
  /*
   * 减少动效时不要把自适应 dpr 挂上去。
   * 场景这时本来就是静止的, 调整分辨率既没有收益, 又会让"同一帧"在两次
   * 截图之间变成不同像素 —— 这正是减少动效检查偶发误报的来源。
   */
  const reducedMotion = usePrefersReducedMotion()

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      camera={{ fov: 58, near: 0.1, far: 400, position: [0, 6, 44] }}
    >
      <color attach="background" args={[PALETTE.bgVoid]} />
      <fog attach="fog" args={[PALETTE.bgVoid, 60, 130]} />
      {!reducedMotion && (
      <PerformanceMonitor
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(1.8)}
      />
      )}
      {!reducedMotion && <AdaptiveDpr pixelated />}
      <ambientLight intensity={0.6} />
      <LensedField lenses={lenses} />
    </Canvas>
  )
}
