/**
 * A small procedural human skeleton.
 *
 * The figure is built from capsules, not a character model, so it stays light
 * and can be rebuilt every frame from two poses: a running pose (animated) and
 * a curled pose. The point of this file is readability: head, chest, hips,
 * shoulders, elbows, hands, knees and feet are all explicit, so the silhouette
 * reads as a person even while it is dissolving into particles.
 *
 * Coordinates: y is up, x is forward. The figure is about 1.85 units tall.
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
}

/** The visible body. Joint spheres are added separately to close the gaps. */
export const BONES: Bone[] = [
  { a: 'hips', b: 'chest', radius: 0.135 },
  { a: 'chest', b: 'neck', radius: 0.1 },
  { a: 'neck', b: 'head', radius: 0.038 },
  { a: 'shoulderL', b: 'shoulderR', radius: 0.052 },
  { a: 'hipL', b: 'hipR', radius: 0.05 },
  { a: 'shoulderL', b: 'elbowL', radius: 0.044 },
  { a: 'elbowL', b: 'handL', radius: 0.035 },
  { a: 'shoulderR', b: 'elbowR', radius: 0.044 },
  { a: 'elbowR', b: 'handR', radius: 0.035 },
  { a: 'hipL', b: 'kneeL', radius: 0.068 },
  { a: 'kneeL', b: 'footL', radius: 0.052 },
  { a: 'hipR', b: 'kneeR', radius: 0.068 },
  { a: 'kneeR', b: 'footR', radius: 0.052 },
]

/** The head is rendered separately as an ellipsoid, not as a joint ball. */
export const HEAD_RADIUS = 0.115

export const JOINT_SPHERES: Array<{ key: JointKey; radius: number }> = [
  { key: 'neck', radius: 0.042 },
  { key: 'shoulderL', radius: 0.05 },
  { key: 'shoulderR', radius: 0.05 },
  { key: 'elbowL', radius: 0.038 },
  { key: 'elbowR', radius: 0.038 },
  { key: 'handL', radius: 0.035 },
  { key: 'handR', radius: 0.035 },
  { key: 'hipL', radius: 0.055 },
  { key: 'hipR', radius: 0.055 },
  { key: 'kneeL', radius: 0.05 },
  { key: 'kneeR', radius: 0.05 },
  { key: 'footL', radius: 0.04 },
  { key: 'footR', radius: 0.04 },
]

function pointFrom(origin: Vec3, angle: number, length: number): Vec3 {
  // 0 is straight down, positive swings forward (+x).
  return [
    origin[0] + Math.sin(angle) * length,
    origin[1] - Math.cos(angle) * length,
    origin[2],
  ]
}

/**
 * A side-on running pose. The arms counter-swing against the legs; the knee
 * bends as the leg travels back, which is what makes the stride read as running
 * rather than walking.
 */
export function runPose(time: number): Joints {
  const phase = time * 5.4
  const bob = Math.cos(phase * 2) * 0.018

  const hips: Vec3 = [0, 1.0 + bob, 0]
  const chest: Vec3 = [0.06, 1.33 + bob, 0.01]
  const neck: Vec3 = [0.075, 1.46 + bob, 0.015]
  const head: Vec3 = [0.09, 1.6 + bob, 0.02]

  const shoulderL: Vec3 = [-0.17, 1.39 + bob, 0.03]
  const shoulderR: Vec3 = [0.27, 1.39 + bob, -0.03]
  const hipL: Vec3 = [-0.1, 1.0 + bob, 0.03]
  const hipR: Vec3 = [0.12, 1.0 + bob, -0.03]

  const leg = (hip: Vec3, ph: number) => {
    const thighAngle = Math.sin(ph) * 0.56
    const knee = pointFrom(hip, thighAngle, 0.43)
    const bend = 0.18 + 0.95 * Math.max(0, -Math.sin(ph))
    const shinAngle = thighAngle - bend
    const foot = pointFrom(knee, shinAngle, 0.41)
    return { knee, foot }
  }

  const arm = (shoulder: Vec3, ph: number) => {
    const upperAngle = -Math.sin(ph) * 0.78
    const elbow = pointFrom(shoulder, upperAngle, 0.28)
    const foreAngle = upperAngle + 1.18
    const hand = pointFrom(elbow, foreAngle, 0.26)
    return { elbow, hand }
  }

  const legL = leg(hipL, phase)
  const legR = leg(hipR, phase + Math.PI)
  const armL = arm(shoulderL, phase + Math.PI)
  const armR = arm(shoulderR, phase)

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

/** A compact, folded pose: knees up, head down, arms wrapped around the legs. */
export const curlPose: Joints = {
  head: [0.03, 0.8, 0.28],
  neck: [0.02, 0.9, 0.13],
  chest: [0, 0.94, 0.05],
  hips: [0, 0.56, 0],
  shoulderL: [-0.16, 0.9, 0.1],
  shoulderR: [0.16, 0.9, 0.02],
  elbowL: [-0.25, 0.7, 0.2],
  elbowR: [0.25, 0.7, 0.06],
  handL: [-0.11, 0.5, 0.27],
  handR: [0.11, 0.5, 0.13],
  hipL: [-0.1, 0.56, 0.04],
  hipR: [0.1, 0.56, -0.04],
  kneeL: [-0.23, 0.46, 0.18],
  kneeR: [0.23, 0.46, 0.02],
  footL: [-0.18, 0.1, 0.24],
  footR: [0.18, 0.1, -0.08],
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
