import { useEffect, useState } from 'react'

/**
 * Returns `null` until the probe has run, then true/false.
 *
 * The stage is decorative; when WebGL is unavailable the page must still be
 * readable as plain scrolling text. The CSS fallback is a static gradient, so
 * there is no blank flash while the probe runs.
 */
export function useWebGL(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setSupported(Boolean(gl))
    } catch {
      setSupported(false)
    }
  }, [])

  return supported
}
