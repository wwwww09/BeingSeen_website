/**
 * A frontal human skeleton for the particle figure.
 *
 * The figure faces +z, toward the camera. The run cycle lifts one knee toward
 * the viewer and drives the arms forward/back in z, so the motion reads as
 * running at the screen rather than a side-on treadmill. The rest pose is a
 * seated slump: knees up, feet forward, hands resting, chest folded.
 *
 * y is up, x is left/right, z is toward the camera. The figure is ~1.75 units
 * tall standing.
 */
export type Vec3 = [number, number, number]

export type JointKey =
  | 'head'
  | 'neck'
  | 'chest'
  | 'hips'
  | 'shoulderL'
  | 'shoulderR'
  | 'elbowL'
  | 'elbowR'
  | 'handL'
  | 'handR'
  | 'hipL'
  | 'hipR'
  | 'kneeL'
  | 'kneeR'
  | 'footL'
  | 'footR'

export type Joints = Record<JointKey, Vec3>

export interface Bone {
  a: JointKey
  b: JointKey
  radius: number
  /** Fixed particle budget, proportional to the bone's visible area. */
  count: number
}

export const BONES: Bone[] = [
  { a: 'hips', b: 'chest', radius: 0.14, count: 11000 },
  { a: 'chest', b: 'neck', radius: 0.105, count: 6500 },
  { a: 'neck', b: 'head', radius: 0.04, count: 1800 },
  { a: 'chest', b: 'shoulderL', radius: 0.05, count: 700 },
  { a: 'chest', b: 'shoulderR', radius: 0.05, count: 700 },
  { a: 'shoulderL', b: 'elbowL', radius: 0.045, count: 3600 },
  { a: 'elbowL', b: 'handL', radius: 0.036, count: 3000 },
  { a: 'shoulderR', b: 'elbowR', radius: 0.045, count: 3600 },
  { a: 'elbowR', b: 'handR', radius: 0.036, count: 3000 },
  { a: 'hipL', b: 'kneeL', radius: 0.07, count: 5200 },
  { a: 'kneeL', b: 'footL', radius: 0.052, count: 4200 },
  { a: 'hipR', b: 'kneeR', radius: 0.07, count: 5200 },
  { a: 'kneeR', b: 'footR', radius: 0.052, count: 4200 },
]

/** Head points are sampled on a sphere in the shader, not on a bone. */
export const HEAD_RADIUS = 0.115

/** The run cycle. One knee comes toward the camera; the other leg supports. */
export function runPose(time: number): Joints {
  const phase = time * 5.2
  const bob = Math.cos(phase * 2) * 0.025
  const sway = Math.sin(phase) * 0.02

  const hips: Vec3 = [sway, 0.965 + bob, 0]
  const chest: Vec3 = [0, 1.31 + bob, 0.03]
  const neck: Vec3 = [0, 1.51 + bob, 0.04]
  const head: Vec3 = [0, 1.62 + bob, 0.045]

  const shoulderL: Vec3 = [-0.21, 1.44 + bob, 0.02 + Math.sin(phase) * 0.035]
  const shoulderR: Vec3 = [0.21, 1.44 + bob, 0.02 - Math.sin(phase) * 0.035]
  const hipL: Vec3 = [-0.114, 0.97 + bob, Math.sin(phase) * 0.02]
  const hipR: Vec3 = [0.114, 0.97 + bob, -Math.sin(phase) * 0.02]

  const leg = (side: -1 | 1, ph: number) => {
    const lift = Math.max(0, Math.sin(ph))
    const knee: Vec3 = [
      side * (0.14 + lift * 0.05),
      0.52 + lift * 0.45,
      0.06 + lift * 0.46,
    ]
    const foot: Vec3 = [
      side * (0.16 + lift * 0.06),
      0.1 + lift * 0.55,
      0.0 + lift * 0.56,
    ]
    return { knee, foot }
  }

  const arm = (side: -1 | 1, ph: number) => {
    const swing = Math.sin(ph)
    const elbow: Vec3 = [
      side * (0.29 + (1 - swing) * 0.02),
      1.12 + swing * 0.07,
      0.1 + swing * 0.22,
    ]
    const hand: Vec3 = [
      side * (0.23 + (1 - swing) * 0.03),
      0.96 + swing * 0.1,
      0.2 + swing * 0.32,
    ]
    return { elbow, hand }
  }

  const legL = leg(-1, phase)
  const legR = leg(1, phase + Math.PI)
  const armL = arm(-1, phase + Math.PI)
  const armR = arm(1, phase)

  return {
    head,
    neck,
    chest,
    hips,
    shoulderL,
    shoulderR,
    elbowL: armL.elbow,
    elbowR: armR.elbow,
    handL: armL.hand,
    handR: armR.hand,
    hipL,
    hipR,
    kneeL: legL.knee,
    kneeR: legR.knee,
    footL: legL.foot,
    footR: legR.foot,
  }
}

/** Seated slump: knees up, feet forward, hands resting, head slightly down. */
export const sitPose: Joints = {
  head: [0, 1.0, 0.18],
  neck: [0, 0.88, 0.14],
  chest: [0, 0.74, 0.1],
  hips: [0, 0.5, 0],
  shoulderL: [-0.17, 0.83, 0.08],
  shoulderR: [0.17, 0.83, 0.08],
  elbowL: [-0.24, 0.66, 0.2],
  elbowR: [0.24, 0.66, 0.2],
  handL: [-0.15, 0.55, 0.34],
  handR: [0.15, 0.55, 0.34],
  hipL: [-0.1, 0.5, 0.02],
  hipR: [0.1, 0.5, 0.02],
  kneeL: [-0.15, 0.58, 0.3],
  kneeR: [0.15, 0.58, 0.3],
  footL: [-0.17, 0.12, 0.38],
  footR: [0.17, 0.12, 0.38],
}

/** Standing, arms at the sides: the pose he rises into for act three. */
export const standPose: Joints = {
  head: [0, 1.62, 0.045],
  neck: [0, 1.51, 0.04],
  chest: [0, 1.31, 0.03],
  hips: [0, 0.965, 0],
  shoulderL: [-0.21, 1.44, 0.02],
  shoulderR: [0.21, 1.44, 0.02],
  elbowL: [-0.24, 1.18, 0.02],
  elbowR: [0.24, 1.18, 0.02],
  handL: [-0.235, 0.95, 0.03],
  handR: [0.235, 0.95, 0.03],
  hipL: [-0.114, 0.97, 0.005],
  hipR: [0.114, 0.97, 0.005],
  kneeL: [-0.114, 0.54, 0.005],
  kneeR: [0.114, 0.54, 0.005],
  footL: [-0.114, 0.1, 0.02],
  footR: [0.114, 0.1, 0.02],
}

/** Reaching toward the camera before the collapse. */
export const reachPose: Joints = {
  head: [0, 1.62, 0.06],
  neck: [0, 1.51, 0.05],
  chest: [0, 1.31, 0.05],
  hips: [0, 0.965, 0],
  shoulderL: [-0.21, 1.44, 0.03],
  shoulderR: [0.21, 1.44, 0.03],
  elbowL: [-0.16, 1.38, 0.5],
  elbowR: [0.23, 1.22, 0.08],
  handL: [-0.08, 1.45, 0.85],
  handR: [0.24, 1.0, 0.1],
  hipL: [-0.114, 0.97, 0.005],
  hipR: [0.114, 0.97, 0.005],
  kneeL: [-0.114, 0.54, 0.005],
  kneeR: [0.114, 0.54, 0.005],
  footL: [-0.114, 0.1, 0.02],
  footR: [0.114, 0.1, 0.02],
}

export function lerpJoints(a: Joints, b: Joints, t: number): Joints {
  const out = {} as Joints
  for (const key of Object.keys(a) as JointKey[]) {
    const av = a[key]
    const bv = b[key]
    out[key] = [
      av[0] + (bv[0] - av[0]) * t,
      av[1] + (bv[1] - av[1]) * t,
      av[2] + (bv[2] - av[2]) * t,
    ]
  }
  return out
}

export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
