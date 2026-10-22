import * as THREE from 'three'
import { BONES, HEAD_RADIUS, standPose, type Vec3 } from '../figure/pose'

export const HUMAN_COUNT = 16_000
export const CROWD_COUNT = 24_000
export const TOTAL = HUMAN_COUNT + CROWD_COUNT

export interface ParticleTargets {
  human: Float32Array
  ball: Float32Array
  hole: Float32Array
  magnetar: Float32Array
  crowd: Float32Array
  star: Float32Array
  role: Float32Array
  warm: Float32Array
  seed: Float32Array
}

const ROLE_RING = 0
const ROLE_CORE = 1
const ROLE_BEAM = 2
const ROLE_CROWD = 3

const UP = new THREE.Vector3(0, 1, 0)
const FALLBACK = new THREE.Vector3(0, 0, 1)

function writePoint(
  out: Float32Array,
  index: number,
  x: number,
  y: number,
  z: number,
) {
  out[index * 3] = x
  out[index * 3 + 1] = y
  out[index * 3 + 2] = z
}

function capsulePoint(a: Vec3, b: Vec3, radius: number): Vec3 {
  const av = new THREE.Vector3(a[0], a[1], a[2])
  const bv = new THREE.Vector3(b[0], b[1], b[2])
  const dir = bv.clone().sub(av)
  const length = dir.length() || 0.001
  dir.normalize()
  const up = Math.abs(dir.y) > 0.95 ? FALLBACK : UP
  const u = new THREE.Vector3().crossVectors(dir, up).normalize()
  const v = new THREE.Vector3().crossVectors(dir, u).normalize()
  const t = Math.random()
  const surface = Math.random() < 0.7
  const radial = surface
    ? radius * (0.86 + Math.random() * 0.14)
    : radius * Math.cbrt(Math.random())
  const angle = Math.random() * Math.PI * 2
  return [
    av.x + dir.x * t * length + u.x * Math.cos(angle) * radial + v.x * Math.sin(angle) * radial,
    av.y + dir.y * t * length + u.y * Math.cos(angle) * radial + v.y * Math.sin(angle) * radial,
    av.z + dir.z * t * length + u.z * Math.cos(angle) * radial + v.z * Math.sin(angle) * radial,
  ]
}

function spherePoint(center: Vec3, radius: number): Vec3 {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.random() < 0.75 ? radius * (0.9 + Math.random() * 0.1) : radius * Math.cbrt(Math.random())
  return [
    center[0] + r * Math.sin(phi) * Math.cos(theta),
    center[1] + r * Math.cos(phi),
    center[2] + r * Math.sin(phi) * Math.sin(theta),
  ]
}

function humanPoint(index: number, boneCounts: number[], boneCursor: number[]): Vec3 {
  // Head is the last of the 16k human particles.
  if (index >= HUMAN_COUNT - 1_800) {
    return spherePoint([0, 1.62, 0.045], HEAD_RADIUS)
  }

  let boneIndex = 0
  // The cursor is advanced once per human body sample below.
  while (boneIndex < BONES.length - 1 && boneCursor[boneIndex] >= boneCounts[boneIndex]) {
    boneIndex++
  }
  boneCursor[boneIndex]++
  const bone = BONES[boneIndex]
  return capsulePoint(standPose[bone.a], standPose[bone.b], bone.radius)
}

function crowdFar(): Vec3 {
  const angle = Math.random() * Math.PI * 2
  const radius = 16 + Math.random() * 12
  return [
    Math.cos(angle) * radius,
    1 + (Math.random() - 0.5) * 10,
    Math.sin(angle) * radius * 0.7,
  ]
}

function crowdNear(): Vec3 {
  const angle = Math.random() * Math.PI * 2
  const radius = 2.0 + Math.pow(Math.random(), 0.7) * 5.4
  return [
    Math.cos(angle) * radius,
    -1.8 + Math.random() * 6.6,
    Math.sin(angle) * radius * 0.7,
  ]
}

function holePoint(role: number): Vec3 {
  if (role === ROLE_CORE) {
    return spherePoint([0, 1, 0], 0.17)
  }
  const angle = Math.random() * Math.PI * 2
  const radius = 0.96 + Math.random() * 0.1
  const tilt = 0.46
  const u = Math.cos(angle) * radius
  const v = Math.sin(angle) * radius
  return [u, 1 + v * Math.sin(tilt), v * Math.cos(tilt)]
}

function magnetarPoint(role: number): Vec3 {
  if (role !== ROLE_BEAM) {
    return spherePoint([0, 1, 0], 0.46)
  }
  const sign = Math.random() < 0.5 ? -1 : 1
  const t = Math.random()
  const radius = 0.05 + 0.22 * (1 - t)
  const angle = Math.random() * Math.PI * 2
  return [
    Math.cos(angle) * radius,
    1 + sign * (0.45 + t * 2.4),
    Math.sin(angle) * radius,
  ]
}

function starPoint(): Vec3 {
  return [
    (Math.random() - 0.5) * 20,
    -2.6 + Math.random() * 8.2,
    (Math.random() - 0.5) * 0.7,
  ]
}

export function buildTargets(): ParticleTargets {
  const human = new Float32Array(TOTAL * 3)
  const ball = new Float32Array(TOTAL * 3)
  const hole = new Float32Array(TOTAL * 3)
  const magnetar = new Float32Array(TOTAL * 3)
  const crowd = new Float32Array(TOTAL * 3)
  const star = new Float32Array(TOTAL * 3)
  const role = new Float32Array(TOTAL)
  const warm = new Float32Array(TOTAL)
  const seed = new Float32Array(TOTAL)

  const bodyHuman = HUMAN_COUNT - 1_800
  const totalWeight = BONES.reduce((sum, bone) => sum + bone.count, 0)
  const boneCounts = BONES.map((bone) => Math.max(80, Math.round((bodyHuman * bone.count) / totalWeight)))
  const boneCursor = new Array(BONES.length).fill(0)
  // Fix rounding drift: the head budget is fixed, the body is clipped by the cursor.
  const humanPositions: Vec3[] = []
  for (let i = 0; i < HUMAN_COUNT; i++) {
    humanPositions.push(humanPoint(i, boneCounts, boneCursor))
  }

  for (let i = 0; i < HUMAN_COUNT; i++) {
    const p = humanPositions[i]
    const r = Math.random() < 0.3 ? ROLE_CORE : Math.random() < 0.8 ? ROLE_RING : ROLE_BEAM
    role[i] = r
    warm[i] = Math.random()
    seed[i] = Math.random() * Math.PI * 2

    writePoint(human, i, p[0], p[1], p[2])
    const ballP = spherePoint([0, 1, 0], 0.56)
    writePoint(ball, i, ballP[0], ballP[1], ballP[2])
    const holeP = holePoint(r)
    writePoint(hole, i, holeP[0], holeP[1], holeP[2])
    const magP = magnetarPoint(r)
    writePoint(magnetar, i, magP[0], magP[1], magP[2])
    writePoint(crowd, i, p[0], p[1], p[2])
    const starP = starPoint()
    writePoint(star, i, starP[0], starP[1], starP[2])
  }

  for (let i = HUMAN_COUNT; i < TOTAL; i++) {
    role[i] = ROLE_CROWD
    warm[i] = Math.random()
    seed[i] = Math.random() * Math.PI * 2

    const far = crowdFar()
    writePoint(human, i, far[0], far[1], far[2])
    writePoint(ball, i, far[0], far[1], far[2])
    writePoint(hole, i, far[0], far[1], far[2])
    writePoint(magnetar, i, far[0], far[1], far[2])
    const near = crowdNear()
    writePoint(crowd, i, near[0], near[1], near[2])
    const starP = starPoint()
    writePoint(star, i, starP[0], starP[1], starP[2])
  }

  return { human, ball, hole, magnetar, crowd, star, role, warm, seed }
}
