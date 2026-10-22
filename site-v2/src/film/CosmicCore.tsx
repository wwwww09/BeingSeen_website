import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { smoothstep } from '../figure/pose'
import { getDiskTexture } from '../scene/diskTexture'

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
  g.addColorStop(0.12, 'rgba(215,235,255,0.95)')
  g.addColorStop(0.28, 'rgba(120,170,255,0.45)')
  g.addColorStop(0.6, 'rgba(70,110,230,0.12)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/**
 * The two cosmic objects the film needs at its centre:
 *
 *   Act 1 — a stellar black hole: event horizon, photon ring, tilted
 *           accretion disk and a faint lensing halo.
 *   Act 2 — a magnetar: a blue neutron star, a cracked wireframe surface,
 *           dipole field rings and polar beams; the FRB flash.
 *
 * It sits at chest height in front of the figure, so the collapse reads as
 * something happening inside the body rather than as a decoration.
 */
export function CosmicCore({ progress }: { progress: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null)
  const blackHole = useRef<THREE.Group>(null)
  const diskSpin = useRef<THREE.Group>(null)
  const magnetar = useRef<THREE.Group>(null)
  const wire = useRef<THREE.Mesh>(null)
  const fields = useRef<THREE.Group>(null)
  const beams = useRef<THREE.Group>(null)
  const flash = useRef<THREE.Sprite>(null)
  const flashMaterial = useRef<THREE.SpriteMaterial>(null)

  const disk = useMemo(() => getDiskTexture(), [])
  const flashTexture = useMemo(() => getFlashTexture(), [])

  useFrame((state, delta) => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const d = Math.min(delta, 0.1)
    const t = state.clock.elapsedTime

    const bh = smoothstep((p - 0.15) / 0.08) * (1 - smoothstep((p - 0.31) / 0.05))
    const mag = smoothstep((p - 0.31) / 0.06) * (1 - smoothstep((p - 0.56) / 0.08))
    const flashAmount = Math.exp(-Math.pow((p - 0.455) / 0.018, 2))

    if (group.current) {
      group.current.visible = bh > 0.01 || mag > 0.01 || flashAmount > 0.02
    }
    if (blackHole.current) {
      blackHole.current.visible = bh > 0.01
      blackHole.current.scale.setScalar(Math.max(0.0001, 0.22 * (0.55 + 0.45 * bh)))
    }
    if (diskSpin.current) {
      diskSpin.current.rotation.z += d * (0.25 + bh * 0.45)
    }
    if (magnetar.current) {
      magnetar.current.visible = mag > 0.01
      magnetar.current.scale.setScalar(Math.max(0.0001, 0.17 * (0.6 + 0.4 * mag)))
      magnetar.current.rotation.y += d * 0.8
    }
    if (wire.current) {
      wire.current.rotation.x += d * 0.35
      wire.current.rotation.y -= d * 0.55
    }
    if (fields.current) {
      fields.current.rotation.y += d * 1.3
      fields.current.rotation.z = Math.sin(t * 0.5) * 0.2
    }
    if (beams.current) {
      beams.current.rotation.y += d * 0.4
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
    <group ref={group} position={[0, 0.86, 0.18]}>
      {/* Stellar black hole */}
      <group ref={blackHole} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 48, 48]} />
          <meshBasicMaterial color="#000000" toneMapped={false} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.16, 0.012, 8, 160]} />
          <meshBasicMaterial
            color="#ffe7c6"
            transparent
            opacity={0.95}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[1.32, 0.055, 8, 160]} />
          <meshBasicMaterial
            color="#ff9a62"
            transparent
            opacity={0.22}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <group ref={diskSpin}>
          <mesh rotation={[1.12, 0, 0]}>
            <planeGeometry args={[5.6, 5.6]} />
            <meshBasicMaterial
              map={disk}
              transparent
              opacity={0.92}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>

      {/* Magnetar */}
      <group ref={magnetar} visible={false}>
        <mesh>
          <sphereGeometry args={[1, 32, 24]} />
          <meshBasicMaterial
            color="#4f7cff"
            transparent
            opacity={0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.52, 24, 18]} />
          <meshBasicMaterial
            color="#dceaff"
            transparent
            opacity={0.75}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={wire}>
          <sphereGeometry args={[1.045, 22, 16]} />
          <meshBasicMaterial
            color="#a9c8ff"
            wireframe
            transparent
            opacity={0.32}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <group ref={fields}>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              rotation={[Math.PI * (0.2 + i * 0.28), i * 0.8, i * 0.5]}
            >
              <torusGeometry args={[1.6 + i * 0.22, 0.012, 6, 120]} />
              <meshBasicMaterial
                color={i === 1 ? '#dceaff' : '#7aa2ff'}
                transparent
                opacity={0.34}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
        <group ref={beams}>
          <mesh position={[0, 1.8, 0]}>
            <coneGeometry args={[0.32, 3.2, 24, 1, true]} />
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
            <coneGeometry args={[0.32, 3.2, 24, 1, true]} />
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
