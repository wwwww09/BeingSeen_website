import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { smoothstep } from '../figure/pose'

function getDiskTexture(): THREE.Texture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, size * 0.1, c, c, size * 0.5)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(0.12, 'rgba(0,0,0,0)')
  g.addColorStop(0.145, 'rgba(255,250,238,1)')
  g.addColorStop(0.17, 'rgba(255,226,180,0.98)')
  g.addColorStop(0.21, 'rgba(255,154,90,0.86)')
  g.addColorStop(0.27, 'rgba(255,96,48,0.52)')
  g.addColorStop(0.36, 'rgba(210,56,24,0.22)')
  g.addColorStop(0.52, 'rgba(140,30,12,0.06)')
  g.addColorStop(1, 'rgba(60,8,2,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  // Uneven arcs and a Doppler-bright side, so the disk is not a clean ring.
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 90; i++) {
    const radius = size * (0.14 + Math.random() * 0.3)
    const start = Math.random() * Math.PI * 2
    const end = start + 0.08 + Math.random() * 0.7
    ctx.beginPath()
    ctx.arc(c, c, radius, start, end)
    ctx.strokeStyle = `rgba(255, ${170 + Math.floor(Math.random() * 70)}, ${
      110 + Math.floor(Math.random() * 70)
    }, ${0.02 + Math.random() * 0.05})`
    ctx.lineWidth = 1 + Math.random() * 3
    ctx.stroke()
  }
  // The approaching side is hotter and brighter.
  for (let i = 0; i < 22; i++) {
    const radius = size * (0.16 + Math.random() * 0.18)
    const start = Math.PI * 1.08 + Math.random() * 0.55
    const end = start + 0.12 + Math.random() * 0.35
    ctx.beginPath()
    ctx.arc(c, c, radius, start, end)
    ctx.strokeStyle = `rgba(255,246,226,${0.05 + Math.random() * 0.08})`
    ctx.lineWidth = 1.5 + Math.random() * 3
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function getCrustTexture(): THREE.Texture {
  const width = 512
  const height = 256
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, '#123a7a')
  bg.addColorStop(0.5, '#1d4f9e')
  bg.addColorStop(1, '#0f2f62')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < 46; i++) {
    let x = Math.random() * width
    let y = Math.random() * height
    ctx.beginPath()
    ctx.moveTo(x, y)
    const segments = 3 + Math.floor(Math.random() * 6)
    for (let j = 0; j < segments; j++) {
      x += (Math.random() - 0.5) * 46
      y += (Math.random() - 0.5) * 26
      ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgba(${150 + Math.floor(Math.random() * 80)}, ${
      190 + Math.floor(Math.random() * 55)
    }, 255, ${0.25 + Math.random() * 0.45})`
    ctx.lineWidth = 0.6 + Math.random() * 1.8
    ctx.stroke()
  }

  // A few hot spots at the magnetic poles.
  for (const [x, y] of [
    [width / 2, 8],
    [width / 2, height - 8],
  ]) {
    const spot = ctx.createRadialGradient(x, y, 0, x, y, 34)
    spot.addColorStop(0, 'rgba(235,245,255,0.95)')
    spot.addColorStop(0.4, 'rgba(140,185,255,0.35)')
    spot.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = spot
    ctx.fillRect(x - 36, y - 36, 72, 72)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function getFlashTexture(): THREE.Texture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.Texture()
  const c = size / 2
  const g = ctx.createRadialGradient(c, c, 0, c, c, c)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.12, 'rgba(225,240,255,0.95)')
  g.addColorStop(0.3, 'rgba(130,175,255,0.42)')
  g.addColorStop(0.62, 'rgba(70,110,230,0.1)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function buildFieldLines(): THREE.TubeGeometry[] {
  const geometries: THREE.TubeGeometry[] = []
  for (let k = 0; k < 9; k++) {
    const phi = (k / 9) * Math.PI * 2
    const points: THREE.Vector3[] = []
    for (let j = 0; j <= 56; j++) {
      const theta = (j / 56) * Math.PI
      const r = 2.0 * Math.pow(Math.sin(theta), 2)
      points.push(
        new THREE.Vector3(r * Math.cos(phi), 2.0 * Math.cos(theta), r * Math.sin(phi)),
      )
    }
    const curve = new THREE.CatmullRomCurve3(points)
    geometries.push(new THREE.TubeGeometry(curve, 42, 0.008, 4, false))
  }
  return geometries
}

/**
 * The two cosmic objects at chest height:
 *
 *  Act 1 — a stellar black hole: black event horizon, thin photon ring,
 *          a tilted, Doppler-bright accretion disk and a faint lensing arc.
 *  Act 2 — a magnetar: a blue neutron star with a cracked crust, curved
 *          dipole field lines, polar hot spots and beamed radio emission.
 */
export function CosmicCore({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  const compact = useThree((state) => state.size.width < 900)
  const blackHole = useRef<THREE.Group>(null)
  const diskSpin = useRef<THREE.Group>(null)
  const magnetar = useRef<THREE.Group>(null)
  const fields = useRef<THREE.Group>(null)
  const beams = useRef<THREE.Group>(null)
  const flash = useRef<THREE.Sprite>(null)
  const flashMaterial = useRef<THREE.SpriteMaterial>(null)

  const disk = useMemo(() => getDiskTexture(), [])
  const crust = useMemo(() => getCrustTexture(), [])
  const flashTexture = useMemo(() => getFlashTexture(), [])
  const fieldLines = useMemo(() => buildFieldLines(), [])

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const d = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime
    const bh = smoothstep((p - 0.15) / 0.08) * (1 - smoothstep((p - 0.31) / 0.05))
    const mag = smoothstep((p - 0.31) / 0.06) * (1 - smoothstep((p - 0.56) / 0.08))
    const flashAmount = Math.exp(-Math.pow((p - 0.455) / 0.018, 2))

    if (group.current) group.current.visible = bh > 0.01 || mag > 0.01 || flashAmount > 0.02
    if (blackHole.current) {
      blackHole.current.visible = bh > 0.01
      blackHole.current.scale.setScalar(Math.max(0.0001, 0.3 * (0.55 + 0.45 * bh)))
    }
    if (diskSpin.current) diskSpin.current.rotation.z += d * (0.22 + bh * 0.4)
    if (magnetar.current) {
      magnetar.current.visible = mag > 0.01
      magnetar.current.scale.setScalar(Math.max(0.0001, 0.24 * (0.6 + 0.4 * mag)))
      magnetar.current.rotation.y += d * 0.7
    }
    if (fields.current) {
      fields.current.rotation.y += d * 0.9
      fields.current.rotation.z = Math.sin(t * 0.4) * 0.16
    }
    if (beams.current) {
      beams.current.rotation.y += d * 0.35
      beams.current.scale.setScalar(0.75 + flashAmount * 0.7)
    }
    if (flash.current && flashMaterial.current) {
      flash.current.visible = flashAmount > 0.02
      const s = 0.9 + flashAmount * 3.0
      flash.current.scale.set(s, s, 1)
      flashMaterial.current.opacity = flashAmount * 0.7
    }
  })

  return (
    <group ref={group} position={[compact ? 0 : 1.15, 0.86, 0.18]}>
      <group ref={blackHole} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 64, 48]} />
          <meshBasicMaterial color="#000000" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.12, 0.008, 8, 200]} />
          <meshBasicMaterial
            color="#fff3dc"
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.03, 0.004, 6, 160]} />
          <meshBasicMaterial
            color="#ffd7a3"
            transparent
            opacity={0.7}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.38, 0.006, 6, 180]} />
          <meshBasicMaterial
            color="#ffb27a"
            transparent
            opacity={0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <group ref={diskSpin}>
          <mesh rotation={[1.3, 0, 0]}>
            <planeGeometry args={[5.6, 5.6]} />
            <meshBasicMaterial
              map={disk}
              transparent
              opacity={0.88}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      <group ref={magnetar} visible={false}>
        {/* Cracked crust */}
        <mesh>
          <sphereGeometry args={[1, 64, 40]} />
          <meshBasicMaterial map={crust} toneMapped={false} />
        </mesh>
        {/* Thin atmosphere */}
        <mesh>
          <sphereGeometry args={[1.06, 32, 24]} />
          <meshBasicMaterial
            color="#4f7cff"
            transparent
            opacity={0.28}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {/* Blue corona */}
        <sprite scale={[3.5, 3.5, 1]} position={[0, 0, -0.2]}>
          <spriteMaterial
            map={flashTexture}
            color="#4f7cff"
            transparent
            opacity={0.2}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        {/* Hot core */}
        <mesh>
          <sphereGeometry args={[0.46, 24, 18]} />
          <meshBasicMaterial
            color="#eaf4ff"
            transparent
            opacity={0.8}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {/* Polar caps */}
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial
            color="#eaf4ff"
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh position={[0, -1, 0]}>
          <sphereGeometry args={[0.14, 16, 12]} />
          <meshBasicMaterial
            color="#eaf4ff"
            transparent
            opacity={0.9}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <group ref={fields}>
          {fieldLines.map((geometry, i) => (
            <mesh key={i} geometry={geometry}>
              <meshBasicMaterial
                color={i % 2 === 0 ? '#a9c8ff' : '#5f8dff'}
                transparent
                opacity={0.26}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
        <group ref={beams}>
          <mesh position={[0, 1.8, 0]}>
            <coneGeometry args={[0.28, 3.2, 24, 1, true]} />
            <meshBasicMaterial
              color="#8fb7ff"
              transparent
              opacity={0.12}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
          <mesh position={[0, -1.8, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.28, 3.2, 24, 1, true]} />
            <meshBasicMaterial
              color="#8fb7ff"
              transparent
              opacity={0.12}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      <sprite ref={flash} visible={false}>
        <spriteMaterial
          ref={flashMaterial}
          map={flashTexture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </sprite>
    </group>
  )
}
