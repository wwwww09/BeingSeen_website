import { lerp, smoothstep } from '../figure/pose'

/**
 * The one shot we are testing:
 *
 *   0.0  side-on run, camera at +x, figure running toward +z
 *   1.0  camera has arced 90 degrees to +z and dollied in; we are in front
 *
 * The figure drifts forward along +z while the camera tracks it, so the run
 * keeps its direction and the orbit changes only the viewpoint.
 */
export const SHOT_START_RADIUS = 6.2
export const SHOT_END_RADIUS = 4.2
export const SHOT_FIGURE_X = 0.9
export const SHOT_LOOK_X = 0.2

export function shotEase(t: number): number {
  return smoothstep(t)
}

export function shotAngle(t: number): number {
  return lerp(Math.PI / 2, 0, shotEase(t))
}

export function shotRadius(t: number): number {
  return lerp(SHOT_START_RADIUS, SHOT_END_RADIUS, shotEase(t))
}

export function shotFigureZ(t: number): number {
  return lerp(-1.4, 1.0, shotEase(t))
}
