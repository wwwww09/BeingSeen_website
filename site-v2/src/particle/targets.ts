import { buildHumanClouds, HUMAN_POINTS } from './humanCloud'

export const HUMAN_COUNT = HUMAN_POINTS
export const CROWD_COUNT = 24_000
export const TOTAL = HUMAN_COUNT + CROWD_COUNT

export interface ParticleTargets {
  run: Float32Array
  ball: Float32Array
  stand: Float32Array
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

function writePoint(out: Float32Array, index: number, x: number, y: number, z: number) {
  out[index * 3] = x
  out[index * 3 + 1] = y
  out[index * 3 + 2] = z
}

function spherePoint(center: [number, number, number], radius: number): [number, number, number] {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.random() < 0.75 ? radius * (0.9 + Math.random() * 0.1) : radius * Math.cbrt(Math.random())
  return [
    center[0] + r * Math.sin(phi) * Math.cos(theta),
    center[1] + r * Math.cos(phi),
    center[2] + r * Math.sin(phi) * Math.sin(theta),
  ]
}

function crowdFar(): [number, number, number] {
  const angle = Math.random() * Math.PI * 2
  const radius = 16 + Math.random() * 12
  return [Math.cos(angle) * radius, 1 + (Math.random() - 0.5) * 10, Math.sin(angle) * radius * 0.7]
}

function crowdNear(): [number, number, number] {
  const angle = Math.random() * Math.PI * 2
  const radius = 2.0 + Math.pow(Math.random(), 0.7) * 5.4
  return [Math.cos(angle) * radius, -1.8 + Math.random() * 6.6, Math.sin(angle) * radius * 0.7]
}

function holePoint(role: number): [number, number, number] {
  if (role === ROLE_CORE) return spherePoint([0, 1, 0], 0.17)
  const angle = Math.random() * Math.PI * 2
  const radius = 0.96 + Math.random() * 0.1
  const tilt = 0.46
  const u = Math.cos(angle) * radius
  const v = Math.sin(angle) * radius
  return [u, 1 + v * Math.sin(tilt), v * Math.cos(tilt)]
}

function magnetarPoint(role: number): [number, number, number] {
  if (role !== ROLE_BEAM) return spherePoint([0, 1, 0], 0.46)
  const sign = Math.random() < 0.5 ? -1 : 1
  const t = Math.random()
  const radius = 0.05 + 0.22 * (1 - t)
  const angle = Math.random() * Math.PI * 2
  return [Math.cos(angle) * radius, 1 + sign * (0.45 + t * 2.4), Math.sin(angle) * radius]
}

function starPoint(): [number, number, number] {
  return [
    (Math.random() - 0.5) * 20,
    -2.6 + Math.random() * 8.2,
    (Math.random() - 0.5) * 0.7,
  ]
}

export function buildTargets(): ParticleTargets {
  const run = new Float32Array(TOTAL * 3)
  const ball = new Float32Array(TOTAL * 3)
  const stand = new Float32Array(TOTAL * 3)
  const hole = new Float32Array(TOTAL * 3)
  const magnetar = new Float32Array(TOTAL * 3)
  const crowd = new Float32Array(TOTAL * 3)
  const star = new Float32Array(TOTAL * 3)
  const role = new Float32Array(TOTAL)
  const warm = new Float32Array(TOTAL)
  const seed = new Float32Array(TOTAL)

  const clouds = buildHumanClouds()

  for (let i = 0; i < HUMAN_COUNT; i++) {
    const r = Math.random() < 0.3 ? ROLE_CORE : Math.random() < 0.8 ? ROLE_RING : ROLE_BEAM
    role[i] = r
    warm[i] = Math.random()
    seed[i] = Math.random() * Math.PI * 2

    const o = i * 3
    writePoint(run, i, clouds.run[o], clouds.run[o + 1], clouds.run[o + 2])
    writePoint(ball, i, clouds.ball[o], clouds.ball[o + 1], clouds.ball[o + 2])
    writePoint(stand, i, clouds.stand[o], clouds.stand[o + 1], clouds.stand[o + 2])

    const h = holePoint(r)
    writePoint(hole, i, h[0], h[1], h[2])
    const m = magnetarPoint(r)
    writePoint(magnetar, i, m[0], m[1], m[2])

    writePoint(crowd, i, clouds.stand[o], clouds.stand[o + 1], clouds.stand[o + 2])
    const s = starPoint()
    writePoint(star, i, s[0], s[1], s[2])
  }

  for (let i = HUMAN_COUNT; i < TOTAL; i++) {
    role[i] = ROLE_CROWD
    warm[i] = Math.random()
    seed[i] = Math.random() * Math.PI * 2

    const far = crowdFar()
    for (const target of [run, ball, stand, hole, magnetar]) {
      writePoint(target, i, far[0], far[1], far[2])
    }
    const n = crowdNear()
    writePoint(crowd, i, n[0], n[1], n[2])
    const s = starPoint()
    writePoint(star, i, s[0], s[1], s[2])
  }

  return { run, ball, stand, hole, magnetar, crowd, star, role, warm, seed }
}
