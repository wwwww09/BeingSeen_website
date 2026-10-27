export const STAR_COUNT = 10000
export const MAX_STORY_LENGTH = 600
export const STORAGE_KEY = 'being-seen:message-board:v1'

export interface Star {
  index: number
  x: number
  y: number
  size: number
  alpha: number
  twinkle: number
  phase: number
  speed: number
}

export interface StoryRecord {
  id: string
  index: number
  x: number
  y: number
  story: string
  createdAt: number
}

/** Deterministic PRNG so the same 10,000 stars return after a reload. */
function mulberry32(seed: number) {
  let value = seed
  return () => {
    value |= 0
    value = (value + 0x6d2b79f5) | 0
    let t = Math.imul(value ^ (value >>> 15), 1 | value)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(0x9e3779b9)
const twinkleRandom = mulberry32(0x51ed270b)

export const STARS: Star[] = Array.from({ length: STAR_COUNT }, (_, index) => ({
  index,
  x: random(),
  y: random(),
  // Keep exactly two random() calls per star for size/alpha so existing
  // stored star indices keep their original x/y positions.
  size: 1 + random() * 0.9,
  alpha: 0.22 + random() * 0.16,
  twinkle: 0.16 + twinkleRandom() * 0.22,
  phase: twinkleRandom() * Math.PI * 2,
  speed: 0.28 + twinkleRandom() * 0.62,
}))

function findNearestIndex(x: number, y: number) {
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY

  for (const star of STARS) {
    const dx = star.x - x
    const dy = star.y - y
    const distance = dx * dx + dy * dy
    if (distance < bestDistance) {
      best = star.index
      bestDistance = distance
    }
  }

  return best
}

export function readStories(): StoryRecord[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const byIndex = new Map<number, StoryRecord>()

    for (const value of parsed) {
      if (!value || typeof value !== 'object') continue
      const item = value as Record<string, unknown>
      const story =
        typeof item.story === 'string'
          ? item.story.trim().slice(0, MAX_STORY_LENGTH)
          : ''
      if (!story) continue

      let index =
        typeof item.index === 'number' && Number.isInteger(item.index)
          ? item.index
          : -1

      if (
        (index < 0 || index >= STARS.length) &&
        typeof item.x === 'number' &&
        typeof item.y === 'number'
      ) {
        index = findNearestIndex(item.x, item.y)
      }

      if (index < 0 || index >= STARS.length) continue
      const star = STARS[index]
      const createdAt =
        typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
          ? item.createdAt
          : Date.now()

      byIndex.set(index, {
        id:
          typeof item.id === 'string' && item.id
            ? item.id
            : `story-${index}`,
        index,
        x: star.x,
        y: star.y,
        story,
        createdAt,
      })
    }

    return Array.from(byIndex.values())
  } catch {
    return []
  }
}

export function saveStories(stories: StoryRecord[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stories))
  } catch {
    // Storage can be unavailable in private mode; the session still works.
  }
}

export function createStoryId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
