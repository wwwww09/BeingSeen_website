'use client'

import { PALETTE } from '@/lib/palette'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, AdaptiveDpr } from '@react-three/drei'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '@/components/three/reducedMotion'

/**
 * FRB 强透镜时间延迟的 3D 光路示意图。
 *
 * 场景: 射电源 → 前景透镜星系 → 地球
 * 光沿两条弯曲路径传播, 较长的一条到达更晚。
 *
 * 运动全部写在 shader 里 (只更新 uTime 一个 uniform), 不在 JS 里逐点运算。
 */

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  varying float vAlpha;

  void main() {
    // 脉冲在路径上反复行进 (x 从 -6 到 6)
    float phase = fract(uTime * 0.2);
    float d = abs(position.x - mix(-6.0, 6.0, phase));
    vAlpha = smoothstep(2.4, 0.0, d) * uProgress;

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // 原来 15.0 的点在小窗里只有一两个像素, 脉冲几乎看不见 —— 放大到 26.0,
    // 并让"正在经过"的那一段明显更大, 这样"光在走"这件事才读得出来
    gl_PointSize = (26.0 / -mv.z) * (0.55 + vAlpha * 2.4);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAG = /* glsl */ `
  varying float vAlpha;
  uniform vec3 uColor;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;
    float glow = smoothstep(0.5, 0.0, r);
    gl_FragColor = vec4(uColor, glow * vAlpha * 0.95);
  }
`

/** 一条被透镜弯折的光路: 从源 (-6,0,0) 经透镜附近再折向地球 (6,0,0) */
function bentPath(sign: number, amplitude: number, samples = 160) {
  const pts: number[] = []
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1)
    const x = -6 + 12 * t
    // 在中间偏折: 用 sin 包络让两端归零
    const y = amplitude * Math.sin(Math.PI * t) * sign
    const z = amplitude * 0.32 * Math.sin(Math.PI * t) * sign
    pts.push(x, y, z)
  }
  return new Float32Array(pts)
}

function LightPaths({ path }: { path: 'short' | 'long' }) {
  const isShort = path === 'short'
  const reducedMotion = usePrefersReducedMotion()
  const positions = useMemo(
    () => (isShort ? bentPath(1, 1.15) : bentPath(1, 2.35)),
    [isShort],
  )
  // 会动的脉冲用亮一档的颜色, 静态轨迹用本色 —— 两者都在单色调里
  const color = isShort ? PALETTE.accentBright : PALETTE.goldSoft
  const dimColor = isShort ? PALETTE.accent : PALETTE.gold

  const uniforms = useMemo(
    () => ({
      uTime: { value: isShort ? 0 : -2.15 }, // 长路径整体晚到
      uProgress: { value: 1 },
      uColor: { value: new THREE.Color(color) },
    }),
    [isShort, color],
  )

  useFrame((_, delta) => {
    // 减少动效时冻结光脉冲: 两条路径的几何形状和"长路径晚到"的先后关系
    // 仍然看得见, 只是不再流动
    if (reducedMotion) return
    uniforms.uTime.value += delta
  })

  return (
    <group>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={160} />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* 静态轨迹辅助线 */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={160} />
        </bufferGeometry>
        <lineBasicMaterial color={dimColor} transparent opacity={0.5} />
      </line>
    </group>
  )
}

/** 透镜星系 (SIS 近似: 一个发光的椭球 + 环) */
function LensGalaxy({ onClick }: { onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null)
  const reducedMotion = usePrefersReducedMotion()
  useFrame((_, d) => {
    if (reducedMotion) return
    if (ref.current) ref.current.rotation.y += d * 0.12
  })
  return (
    <group>
      <mesh ref={ref} onClick={onClick}>
        <sphereGeometry args={[0.85, 32, 24]} />
        <meshBasicMaterial color={PALETTE.accentDeep} transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[Math.PI / 2.3, 0.4, 0]}>
        <torusGeometry args={[1.5, 0.045, 12, 80]} />
        <meshBasicMaterial color={PALETTE.violet} transparent opacity={0.9} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2} color={PALETTE.violet} />
    </group>
  )
}

/** 射电源 / 地球标记 */
function Marker({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.62, 20, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>
    </group>
  )
}

export default function TimeDelayScene() {
  const [showLong, setShowLong] = useState(true)
  const [dpr, setDpr] = useState(1.4)
  const reducedMotion = usePrefersReducedMotion()

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        dpr={dpr}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: 46, position: [0, 5.2, 13.5] }}
      >
        <color attach="background" args={[PALETTE.bgVoid]} />
        {!reducedMotion && <AdaptiveDpr pixelated />}
        <ambientLight intensity={0.8} />
        <OrbitControls
          enablePan={false}
          minDistance={8}
          maxDistance={26}
          autoRotate={!reducedMotion}
          autoRotateSpeed={0.42}
        />

        {/* 短路径 (蓝) 与 长路径 (金) */}
        <LightPaths path="short" />
        {showLong && <LightPaths path="long" />}

        <LensGalaxy onClick={() => setShowLong((v) => !v)} />
        <Marker position={[-6, 0, 0]} color={PALETTE.goldSoft} />
        <Marker position={[6, 0, 0]} color={PALETTE.accentBright} />

        <gridHelper args={[22, 22, PALETTE.border, PALETTE.bgDeep]} position={[0, -2.6, 0]} />
      </Canvas>

      <div className="canvas-hint">
        drag to rotate · scroll to zoom · click the galaxy to toggle the long path
      </div>
    </div>
  )
}
