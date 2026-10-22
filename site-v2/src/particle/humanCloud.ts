/**
 * The human is not a 2D mask and not a visible primitive mesh.
 *
 * It is a 3D stardust cloud assembled from soft mathematical volumes
 * (ellipsoids + tapered capsules) and then distorted with low-frequency value
 * noise. The result reads as an abstract human silhouette made of dust, not a
 * pixelated cut-out and not a rig of spheres and cylinders.
 */

export const HUMAN_POINTS = 16_000

type Vec3 = [number, number, number]

type Part =
  | {
      kind: 'ellipsoid'
      center: Vec3
      radii: Vec3
      rotZ?: number
      rotY?: number
      weight: number
    }
  | {
      kind: 'capsule'
      a: Vec3
      b: Vec3
      radius: number
      weight: number
    }

function hash3(x: number, y: number, z: number, seed: number): number {
  let h = Math.imul(seed + Math.floor(x), 374761393)
  h = Math.imul(h ^ Math.floor(y), 668265263)
  h = Math.imul(h ^ Math.floor(z), 1274126177)
  h ^= h >>> 13
  h = Math.imul(h, 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967295
}

function noise3(x: number, y: number, z: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const w = zf * zf * (3 - 2 * zf)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const c000 = hash3(xi, yi, zi, seed)
  const c100 = hash3(xi + 1, yi, zi, seed)
  const c010 = hash3(xi, yi + 1, zi, seed)
  const c110 = hash3(xi + 1, yi + 1, zi, seed)
  const c001 = hash3(xi, yi, zi + 1, seed)
  const c101 = hash3(xi + 1, yi, zi + 1, seed)
  const c011 = hash3(xi, yi + 1, zi + 1, seed)
  const c111 = hash3(xi + 1, yi + 1, zi + 1, seed)
  const x00 = lerp(c000, c100, u)
  const x10 = lerp(c010, c110, u)
  const x01 = lerp(c001, c101, u)
  const x11 = lerp(c011, c111, u)
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w)
}

function jitter(p: Vec3, amount: number, seed: number): Vec3 {
  const nx = noise3(p[0] * 1.9 + seed, p[1] * 1.9, p[2] * 1.9, seed)
  const ny = noise3(p[0] * 1.9, p[1] * 1.9 + seed, p[2] * 1.9, seed + 19)
  const nz = noise3(p[0] * 1.9, p[1] * 1.9, p[2] * 1.9 + seed, seed + 37)
  return [p[0] + (nx - 0.5) * amount, p[1] + (ny - 0.5) * amount, p[2] + (nz - 0.5) * amount]
}

function rotate(p: Vec3, rotZ: number, rotY: number): Vec3 {
  const cz = Math.cos(rotZ)
  const sz = Math.sin(rotZ)
  const x1 = p[0] * cz - p[1] * sz
  const y1 = p[0] * sz + p[1] * cz
  const cy = Math.cos(rotY)
  const sy = Math.sin(rotY)
  const x2 = x1 * cy + p[2] * sy
  const z2 = -x1 * sy + p[2] * cy
  return [x2, y1, z2]
}

function ellipsoidPoint(part: Extract<Part, { kind: 'ellipsoid' }>, seed: number): Vec3 {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.cbrt(Math.random())
  const local: Vec3 = [
    Math.sin(phi) * Math.cos(theta) * part.radii[0] * r,
    Math.cos(phi) * part.radii[1] * r,
    Math.sin(phi) * Math.sin(theta) * part.radii[2] * r,
  ]
  const rotated = rotate(local, part.rotZ ?? 0, part.rotY ?? 0)
  return jitter(
    [part.center[0] + rotated[0], part.center[1] + rotated[1], part.center[2] + rotated[2]],
    0.095,
    seed,
  )
}

function capsulePoint(part: Extract<Part, { kind: 'capsule' }>, seed: number): Vec3 {
  const dx = part.b[0] - part.a[0]
  const dy = part.b[1] - part.a[1]
  const dz = part.b[2] - part.a[2]
  const length = Math.hypot(dx, dy, dz) || 0.001
  const dir: Vec3 = [dx / length, dy / length, dz / length]
  const up: Vec3 = Math.abs(dir[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]
  const u: Vec3 = [
    dir[1] * up[2] - dir[2] * up[1],
    dir[2] * up[0] - dir[0] * up[2],
    dir[0] * up[1] - dir[1] * up[0],
  ]
  const uLen = Math.hypot(u[0], u[1], u[2]) || 1
  const ux = u[0] / uLen
  const uy = u[1] / uLen
  const uz = u[2] / uLen
  const vx = dir[1] * uz - dir[2] * uy
  const vy = dir[2] * ux - dir[0] * uz
  const vz = dir[0] * uy - dir[1] * ux
  const t = Math.random()
  const theta = Math.random() * Math.PI * 2
  const radial = Math.cbrt(Math.random()) * part.radius
  const cx = part.a[0] + dx * t
  const cy = part.a[1] + dy * t
  const cz = part.a[2] + dz * t
  return jitter(
    [
      cx + (ux * Math.cos(theta) + vx * Math.sin(theta)) * radial,
      cy + (uy * Math.cos(theta) + vy * Math.sin(theta)) * radial,
      cz + (uz * Math.cos(theta) + vz * Math.sin(theta)) * radial,
    ],
    0.085,
    seed,
  )
}

function runParts(): Part[] {
  return [
    // Lean torso
    { kind: 'ellipsoid', center: [0, 1.16, 0], radii: [0.21, 0.33, 0.16], rotZ: -0.18, rotY: 0.12, weight: 4400 },
    { kind: 'ellipsoid', center: [0.06, 1.6, 0.03], radii: [0.135, 0.155, 0.13], weight: 1600 },
    { kind: 'capsule', a: [0, 1.4, 0], b: [0.06, 1.52, 0.03], radius: 0.08, weight: 500 },
    { kind: 'ellipsoid', center: [-0.16, 1.36, 0], radii: [0.1, 0.12, 0.1], weight: 300 },
    { kind: 'ellipsoid', center: [0.16, 1.36, 0], radii: [0.1, 0.12, 0.1], weight: 300 },
    // Reaching arm, toward the camera
    { kind: 'capsule', a: [0.17, 1.36, 0.01], b: [0.4, 1.47, 0.2], radius: 0.075, weight: 1200 },
    { kind: 'capsule', a: [0.4, 1.47, 0.2], b: [0.57, 1.52, 0.4], radius: 0.06, weight: 900 },
    { kind: 'ellipsoid', center: [0.6, 1.53, 0.43], radii: [0.09, 0.07, 0.08], weight: 380 },
    // Trailing arm
    { kind: 'capsule', a: [-0.17, 1.36, 0], b: [-0.33, 1.14, -0.16], radius: 0.07, weight: 1000 },
    { kind: 'capsule', a: [-0.33, 1.14, -0.16], b: [-0.42, 0.9, -0.28], radius: 0.058, weight: 700 },
    { kind: 'ellipsoid', center: [-0.43, 0.87, -0.3], radii: [0.07, 0.06, 0.07], weight: 280 },
    // Front leg
    { kind: 'capsule', a: [-0.12, 0.92, 0], b: [-0.18, 0.58, 0.18], radius: 0.1, weight: 1300 },
    { kind: 'capsule', a: [-0.18, 0.58, 0.18], b: [-0.12, 0.14, 0.38], radius: 0.08, weight: 1000 },
    { kind: 'ellipsoid', center: [-0.1, 0.1, 0.42], radii: [0.1, 0.06, 0.14], weight: 360 },
    // Back leg
    { kind: 'capsule', a: [0.12, 0.92, 0], b: [0.26, 0.62, -0.12], radius: 0.1, weight: 1300 },
    { kind: 'capsule', a: [0.26, 0.62, -0.12], b: [0.38, 0.2, -0.28], radius: 0.08, weight: 1000 },
    { kind: 'ellipsoid', center: [0.4, 0.17, -0.3], radii: [0.1, 0.06, 0.14], weight: 360 },
  ]
}

function standParts(): Part[] {
  return [
    { kind: 'ellipsoid', center: [0, 1.16, 0], radii: [0.21, 0.34, 0.15], weight: 4600 },
    { kind: 'ellipsoid', center: [0, 1.6, 0], radii: [0.135, 0.155, 0.13], weight: 1700 },
    { kind: 'capsule', a: [0, 1.4, 0], b: [0, 1.52, 0], radius: 0.08, weight: 500 },
    { kind: 'ellipsoid', center: [-0.16, 1.36, 0], radii: [0.1, 0.12, 0.1], weight: 300 },
    { kind: 'ellipsoid', center: [0.16, 1.36, 0], radii: [0.1, 0.12, 0.1], weight: 300 },
    { kind: 'capsule', a: [-0.17, 1.36, 0], b: [-0.23, 1.1, 0.04], radius: 0.07, weight: 1000 },
    { kind: 'capsule', a: [-0.23, 1.1, 0.04], b: [-0.25, 0.87, 0.08], radius: 0.058, weight: 820 },
    { kind: 'ellipsoid', center: [-0.25, 0.83, 0.09], radii: [0.07, 0.08, 0.06], weight: 260 },
    { kind: 'capsule', a: [0.17, 1.36, 0], b: [0.23, 1.1, 0.04], radius: 0.07, weight: 1000 },
    { kind: 'capsule', a: [0.23, 1.1, 0.04], b: [0.25, 0.87, 0.08], radius: 0.058, weight: 820 },
    { kind: 'ellipsoid', center: [0.25, 0.83, 0.09], radii: [0.07, 0.08, 0.06], weight: 260 },
    { kind: 'capsule', a: [-0.12, 0.92, 0], b: [-0.13, 0.52, 0.02], radius: 0.1, weight: 1300 },
    { kind: 'capsule', a: [-0.13, 0.52, 0.02], b: [-0.14, 0.12, 0.04], radius: 0.08, weight: 1200 },
    { kind: 'ellipsoid', center: [-0.14, 0.08, 0.06], radii: [0.1, 0.06, 0.14], weight: 360 },
    { kind: 'capsule', a: [0.12, 0.92, 0], b: [0.13, 0.52, 0.02], radius: 0.1, weight: 1300 },
    { kind: 'capsule', a: [0.13, 0.52, 0.02], b: [0.14, 0.12, 0.04], radius: 0.08, weight: 1200 },
    { kind: 'ellipsoid', center: [0.14, 0.08, 0.06], radii: [0.1, 0.06, 0.14], weight: 360 },
  ]
}

function allocate(parts: Part[], count: number): number[] {
  const total = parts.reduce((sum, p) => sum + p.weight, 0)
  const counts = parts.map((p) => Math.max(40, Math.round((count * p.weight) / total)))
  let drift = counts.reduce((sum, n) => sum + n, 0) - count
  let i = 0
  while (drift > 0) {
    if (counts[i] > 40) {
      counts[i]--
      drift--
    }
    i = (i + 1) % counts.length
  }
  while (drift < 0) {
    counts[i]++
    drift++
    i = (i + 1) % counts.length
  }
  return counts
}

function sampleParts(parts: Part[], count: number): Float32Array[] {
  const counts = allocate(parts, count)
  const out: Vec3[] = []
  for (let i = 0; i < parts.length; i++) {
    for (let j = 0; j < counts[i]; j++) {
      const part = parts[i]
      const seed = i * 97 + j * 0.17
      const p = part.kind === 'ellipsoid' ? ellipsoidPoint(part, seed) : capsulePoint(part, seed)
      out.push(p)
    }
  }
  while (out.length < count) out.push(out[Math.floor(Math.random() * out.length)])
  return [flatten(out.slice(0, count))]
}

function flatten(points: Vec3[]): Float32Array {
  const out = new Float32Array(points.length * 3)
  for (let i = 0; i < points.length; i++) {
    out[i * 3] = points[i][0]
    out[i * 3 + 1] = points[i][1]
    out[i * 3 + 2] = points[i][2]
  }
  return out
}

function leanRun(points: Float32Array): Float32Array {
  const out = new Float32Array(points.length)
  for (let i = 0; i < points.length; i += 3) {
    const x = points[i]
    const y = points[i + 1] - 0.95
    const z = points[i + 2]
    const cz = Math.cos(-0.16)
    const sz = Math.sin(-0.16)
    const x1 = x * cz - y * sz
    const y1 = x * sz + y * cz
    out[i] = x1
    out[i + 1] = y1 + 0.95
    out[i + 2] = z
  }
  return out
}

function ballPoints(count: number): Float32Array {
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const radius = 0.56 * Math.cbrt(Math.random())
    const p: Vec3 = [
      Math.sin(phi) * Math.cos(theta) * radius,
      0.98 + Math.sin(phi) * Math.sin(theta) * 0.02 + Math.cos(phi) * radius,
      Math.cos(phi) * radius,
    ]
    const j = jitter(p, 0.045, i * 0.13)
    out[i * 3] = j[0]
    out[i * 3 + 1] = j[1]
    out[i * 3 + 2] = j[2]
  }
  return out
}

export interface HumanClouds {
  run: Float32Array
  ball: Float32Array
  stand: Float32Array
}

export function buildHumanClouds(): HumanClouds {
  const run = leanRun(sampleParts(runParts(), HUMAN_POINTS)[0])
  const stand = sampleParts(standParts(), HUMAN_POINTS)[0]
  const ball = ballPoints(HUMAN_POINTS)

  // Soft global drift so the cloud reads as dust, never as a solid skin.
  for (let i = 0; i < HUMAN_POINTS; i++) {
    const o = i * 3
    const rx = (Math.random() - 0.5) * 0.035
    const ry = (Math.random() - 0.5) * 0.035
    const rz = (Math.random() - 0.5) * 0.035
    run[o] += rx
    run[o + 1] += ry
    run[o + 2] += rz
    stand[o] += rx * 0.8
    stand[o + 1] += ry * 0.8
    stand[o + 2] += rz * 0.8
  }

  return { run, ball, stand }
}
