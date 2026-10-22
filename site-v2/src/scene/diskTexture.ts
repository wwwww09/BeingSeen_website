import * as THREE from 'three'

let texture: THREE.Texture | null = null

/**
 * The accretion-disk texture, generated at runtime.
 *
 * It is a radial gradient in the plane of the ring: a transparent inner edge,
 * a hot orange-white band, then a long fade. A handful of low-alpha arcs add
 * the uneven brightness of a real disk without turning it into a noise field.
 */
export function getDiskTexture(): THREE.Texture {
  if (texture) return texture

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) return new THREE.Texture()

  const center = size / 2
  const gradient = context.createRadialGradient(
    center,
    center,
    size * 0.1,
    center,
    center,
    size * 0.5,
  )
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(0.12, 'rgba(255, 244, 224, 0.95)')
  gradient.addColorStop(0.18, 'rgba(255, 206, 150, 0.92)')
  gradient.addColorStop(0.26, 'rgba(255, 122, 70, 0.72)')
  gradient.addColorStop(0.38, 'rgba(255, 82, 45, 0.34)')
  gradient.addColorStop(0.62, 'rgba(220, 55, 30, 0.1)')
  gradient.addColorStop(1, 'rgba(160, 30, 15, 0)')

  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  // Uneven bright arcs, so the disk reads as moving matter rather than a decal.
  context.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 26; i++) {
    const radius = size * (0.12 + Math.random() * 0.32)
    const start = Math.random() * Math.PI * 2
    const end = start + 0.15 + Math.random() * 0.9
    context.beginPath()
    context.arc(center, center, radius, start, end)
    context.strokeStyle = `rgba(255, ${150 + Math.floor(Math.random() * 90)}, ${
      80 + Math.floor(Math.random() * 60)
    }, ${0.025 + Math.random() * 0.055})`
    context.lineWidth = 1 + Math.random() * 3.5
    context.stroke()
  }

  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
