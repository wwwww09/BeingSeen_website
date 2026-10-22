/**
 * A continuous path for the lens across the scroll.
 *
 * Each key is the scroll fraction at which a section is centred, together with
 * the horizontal position the lens should have while that section is being
 * read. Between keys the position is interpolated with a smoothstep, so the
 * body glides across the screen instead of switching sides at a threshold.
 */
export interface LensKey {
  p: number
  x: number
}

export const LENS_X = 1.55

export function sampleLensPath(keys: LensKey[], p: number): number {
  if (keys.length === 0) return LENS_X
  if (p <= keys[0].p) return keys[0].x

  for (let i = 0; i < keys.length - 1; i++) {
    const from = keys[i]
    const to = keys[i + 1]
    if (p <= to.p) {
      const span = to.p - from.p
      const t = span > 1e-6 ? (p - from.p) / span : 1
      const eased = t * t * (3 - 2 * t)
      return from.x + (to.x - from.x) * eased
    }
  }

  return keys[keys.length - 1].x
}
