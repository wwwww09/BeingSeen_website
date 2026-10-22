/**
 * Stage 1 only: a clean 2D coordinate map of a forward-leaning runner.
 *
 * The shape is authored as a 2D thick outline (head, leaning torso, extending
 * arm, two running legs). Each point then gets a small random Z so the cloud
 * has volume, while the silhouette stays crisp from the camera.
 *
 * The back edge (trailing leg / back of the torso) is marked for the soft
 * opacity fade and backward displacement.
 */

export const STAGE1_COUNT = 16_000

export interface Stage1Run {
  positions: Float32Array
  trail: Float32Array
  arm: Float32Array
}

function line(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  width: number,
  count: number,
  out: Float32Array,
  trailOut: Float32Array,
  armOut: Float32Array,
  arm: number,
  start: number,
) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 0.001
  const nx = -dy / len
  const ny = dx / len
  for (let i = 0; i < count; i++) {
    const t = Math.random()
    const side = (Math.random() - 0.5) * width
    // round the ends a little
    const endRound = Math.random() < 0.18 ? Math.sqrt(Math.random()) : 1
    const jx = (Math.random() - 0.5) * 0.012
    const jy = (Math.random() - 0.5) * 0.012
    const x = ax + dx * t + nx * side * endRound + jx
    const y = ay + dy * t + ny * side * endRound + jy
    const index = start + i
    out[index * 3] = x
    out[index * 3 + 1] = y
    out[index * 3 + 2] = (Math.random() - 0.5) * 0.34
    trailOut[index] = Math.max(0, Math.min(1, (0.02 - x) / 0.52))
    armOut[index] = arm
  }
}

function disk(
  cx: number,
  cy: number,
  r: number,
  count: number,
  out: Float32Array,
  trailOut: Float32Array,
  armOut: Float32Array,
  arm: number,
  start: number,
) {
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const rr = r * Math.sqrt(Math.random())
    const x = cx + Math.cos(theta) * rr
    const y = cy + Math.sin(theta) * rr
    const index = start + i
    out[index * 3] = x
    out[index * 3 + 1] = y
    out[index * 3 + 2] = (Math.random() - 0.5) * 0.34
    trailOut[index] = Math.max(0, Math.min(1, (0.02 - x) / 0.52))
    armOut[index] = arm
  }
}

export function buildStage1Run(): Stage1Run {
  const positions = new Float32Array(STAGE1_COUNT * 3)
  const trail = new Float32Array(STAGE1_COUNT)
  const arm = new Float32Array(STAGE1_COUNT)
  let i = 0

  // Head
  disk(0.17, 1.58, 0.145, 1_700, positions, trail, arm, 0, i)
  i += 1_700

  // Leaning torso: hips -> chest -> shoulders
  line(0.0, 0.84, 0.06, 1.1, 0.23, 2_300, positions, trail, arm, 0, i)
  i += 2_300
  line(0.06, 1.1, 0.14, 1.36, 0.22, 1_900, positions, trail, arm, 0, i)
  i += 1_900

  // Neck
  line(0.16, 1.42, 0.17, 1.5, 0.09, 500, positions, trail, arm, 0, i)
  i += 500

  // Extending arm (shoulder -> elbow -> hand)
  line(0.2, 1.34, 0.48, 1.38, 0.1, 1_500, positions, trail, arm, 1, i)
  i += 1_500
  line(0.48, 1.38, 0.76, 1.42, 0.085, 1_200, positions, trail, arm, 1, i)
  i += 1_200
  disk(0.8, 1.43, 0.085, 500, positions, trail, arm, 1, i)
  i += 500

  // Trailing arm
  line(0.02, 1.34, -0.22, 1.12, 0.09, 1_100, positions, trail, arm, 0, i)
  i += 1_100
  line(-0.22, 1.12, -0.38, 0.9, 0.08, 850, positions, trail, arm, 0, i)
  i += 850
  disk(-0.41, 0.87, 0.075, 300, positions, trail, arm, 0, i)
  i += 300

  // Front running leg
  line(0.03, 0.84, 0.3, 0.5, 0.15, 1_600, positions, trail, arm, 0, i)
  i += 1_600
  line(0.3, 0.5, 0.52, 0.1, 0.12, 1_300, positions, trail, arm, 0, i)
  i += 1_300
  disk(0.55, 0.08, 0.13, 450, positions, trail, arm, 0, i)
  i += 450

  // Back running leg (trailing edge)
  line(-0.02, 0.84, -0.28, 0.46, 0.15, 1_600, positions, trail, arm, 0, i)
  i += 1_600
  line(-0.28, 0.46, -0.54, 0.07, 0.12, 1_300, positions, trail, arm, 0, i)
  i += 1_300
  disk(-0.57, 0.06, 0.13, 450, positions, trail, arm, 0, i)
  i += 450

  return { positions, trail, arm }
}
