import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { MotionValue } from 'framer-motion'
import * as THREE from 'three'
import { smoothstep } from '../figure/pose'
import { getDotTexture } from '../scene/dotTexture'

const COUNT = 1_600

function createHumanTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 192
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  ctx.clearRect(0, 0, 96, 192)
  ctx.save()
  ctx.translate(48, 96)
  ctx.filter = 'blur(1.6px)'
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.lineCap = 'round'

  // A soft standing silhouette; at a distance it is only a glowing person.
  ctx.beginPath()
  ctx.arc(0, -62, 12, 0, Math.PI * 2)
  ctx.fill()

  ctx.beginPath()
  ctx.ellipse(0, -22, 19, 35, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(-13, -43)
  ctx.lineTo(-25, 15)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(13, -43)
  ctx.lineTo(25, 15)
  ctx.stroke()

  ctx.lineWidth = 11
  ctx.beginPath()
  ctx.moveTo(-8, 8)
  ctx.lineTo(-13, 66)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(8, 8)
  ctx.lineTo(13, 66)
  ctx.stroke()

  // A soft halo around the body.
  const glow = ctx.createRadialGradient(0, -10, 4, 0, -10, 74)
  glow.addColorStop(0, 'rgba(255,255,255,0.28)')
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, -10, 78, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function CrowdField({ progress }: { progress: MotionValue<number> }) {
  const crowdRef = useRef<THREE.InstancedMesh>(null)
  const starsRef = useRef<THREE.Points>(null)

  const data = useMemo(() => {
    const texture = createHumanTexture()
    const geometry = new THREE.PlaneGeometry(0.7, 1.4)
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, COUNT)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage)

    const dummy = new THREE.Object3D()
    const color = new THREE.Color()
    const starPositions = new Float32Array(COUNT * 3)
    const starColors = new Float32Array(COUNT * 3)

    for (let i = 0; i < COUNT; i++) {
      const x = (Math.random() - 0.5) * 42
      const z = -38 + Math.random() * 24
      const scale = 0.55 + Math.random() * 0.65
      const y = 0.7 * scale
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(scale)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)

      color
        .set(Math.random() < 0.16 ? '#ffd7a3' : Math.random() < 0.5 ? '#b9c8ff' : '#efe9df')
        .multiplyScalar(0.12 + Math.random() * 0.16)
      mesh.setColorAt(i, color)

      starPositions[i * 3] = x
      starPositions[i * 3 + 1] = 0.75 + Math.random() * 1.1
      starPositions[i * 3 + 2] = z
      starColors[i * 3] = color.r
      starColors[i * 3 + 1] = color.g
      starColors[i * 3 + 2] = color.b
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3))
    const starMaterial = new THREE.PointsMaterial({
      size: 0.07,
      sizeAttenuation: true,
      vertexColors: true,
      map: getDotTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const stars = new THREE.Points(starGeometry, starMaterial)
    stars.frustumCulled = false

    return { mesh, material, stars, starMaterial }
  }, [])

  useFrame(() => {
    const p = THREE.MathUtils.clamp(progress.get(), 0, 1)
    const appear = smoothstep((p - 0.52) / 0.08)
    const leave = 1 - smoothstep((p - 0.72) / 0.08)

    const crowd = crowdRef.current
    if (crowd) {
      const material = crowd.material as THREE.MeshBasicMaterial
      material.opacity = appear * leave * 0.18
      crowd.visible = appear * leave > 0.01
    }
    const stars = starsRef.current
    if (stars) {
      const material = stars.material as THREE.PointsMaterial
      material.opacity = smoothstep((p - 0.74) / 0.1) * 0.7
      stars.visible = material.opacity > 0.01
    }
  })

  return (
    <group>
      <primitive ref={crowdRef} object={data.mesh} />
      <primitive ref={starsRef} object={data.stars} />
    </group>
  )
}
