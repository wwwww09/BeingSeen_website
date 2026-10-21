import * as THREE from 'three'

let texture: THREE.Texture | null = null

/**
 * A tiny radial-gradient sprite, generated at runtime so the project does not
 * need to ship a texture file. Without it, `pointsMaterial` draws squares —
 * which is fine for distant stars but obvious and ugly for the orbital dust
 * that passes close to the camera.
 */
export function getDotTexture(): THREE.Texture {
  if (texture) return texture

  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) return new THREE.Texture()

  const gradient = context.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.85)')
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.22)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')

  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)

  texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}
