import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  MAX_STORY_LENGTH,
  STAR_COUNT,
  type StoryRecord,
} from './messageBoard'

const env = import.meta.env
const supabaseUrl = env.VITE_SUPABASE_URL as string | undefined
const supabaseKey = (env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY) as string | undefined

export const isPublicBoard = Boolean(supabaseUrl && supabaseKey)

const supabase: SupabaseClient | null = isPublicBoard
  ? createClient(supabaseUrl as string, supabaseKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null

interface StoryRow {
  id: string
  star_index: number
  x: number
  y: number
  story: string
  owner_id: string
  created_at: string
}

export interface NewPublicStory {
  index: number
  x: number
  y: number
  story: string
}

function toStory(row: StoryRow): StoryRecord | null {
  const index = Number(row.star_index)
  const x = Number(row.x)
  const y = Number(row.y)
  const createdAt = new Date(row.created_at).getTime()
  const story =
    typeof row.story === 'string'
      ? row.story.trim().slice(0, MAX_STORY_LENGTH)
      : ''

  if (
    typeof row.id !== 'string' ||
    !row.id ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= STAR_COUNT ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(createdAt) ||
    !story
  ) {
    return null
  }

  return {
    id: row.id,
    index,
    x,
    y,
    story,
    createdAt,
    ownerId: typeof row.owner_id === 'string' ? row.owner_id : undefined,
  }
}

let userPromise: Promise<string> | null = null

/**
 * Every visitor gets a persistent anonymous Supabase user. The user id is
 * what makes "delete my story" possible without collecting a name or email.
 */
export function ensureAnonymousUser(): Promise<string> {
  if (!supabase) return Promise.resolve('')
  if (userPromise) return userPromise

  userPromise = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (session?.user) return session.user.id

    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    if (!data.user) throw new Error('Could not start an anonymous session.')
    return data.user.id
  })().catch((error) => {
    userPromise = null
    throw error
  })

  return userPromise
}

export async function fetchPublicStories(): Promise<StoryRecord[]> {
  if (!supabase) return []

  const rows: StoryRow[] = []

  // Supabase caps REST responses at 1,000 rows by default, so page through
  // the board rather than silently hiding stories past the first page.
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await supabase
      .from('stories')
      .select('id, star_index, x, y, story, owner_id, created_at')
      .order('created_at', { ascending: false })
      .range(from, from + 999)

    if (error) throw error

    const batch = (data ?? []) as StoryRow[]
    rows.push(...batch)
    if (batch.length < 1000) break
  }

  return rows
    .map(toStory)
    .filter((story): story is StoryRecord => story !== null)
}

export async function createPublicStory(
  input: NewPublicStory,
): Promise<StoryRecord> {
  if (!supabase) throw new Error('The public board is not configured.')
  const ownerId = await ensureAnonymousUser()
  if (!ownerId) throw new Error('Could not start an anonymous session.')

  const { data, error } = await supabase
    .from('stories')
    .insert({
      star_index: input.index,
      x: input.x,
      y: input.y,
      story: input.story,
      owner_id: ownerId,
    })
    .select('id, star_index, x, y, story, owner_id, created_at')
    .single()

  if (error) throw error
  const story = toStory(data as StoryRow)
  if (!story) {
    throw new Error('The story was saved but could not be read back.')
  }
  return story
}

export async function deletePublicStory(id: string): Promise<void> {
  if (!supabase) throw new Error('The public board is not configured.')

  const { data, error } = await supabase
    .from('stories')
    .delete()
    .eq('id', id)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      'Only the visitor who wrote this story can delete it.',
    )
  }
}

export function subscribeToPublicStories(onChange: () => void): () => void {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('public:stories')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'stories' },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

/**
 * PostgREST errors are not always Error instances, so read `.message`
 * defensively and translate the two failures a visitor can actually fix.
 */
export function storyErrorMessage(error: unknown, fallback: string) {
  let message = fallback

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const value = (error as { message?: unknown }).message
    if (typeof value === 'string' && value.trim()) message = value
  } else if (error instanceof Error && error.message) {
    message = error.message
  }

  if (
    message.includes('stories_star_index_key') ||
    message.toLowerCase().includes('duplicate key')
  ) {
    return 'That star was just lit by someone else. Choose another dark star.'
  }

  if (message.includes('row-level security')) {
    return 'The board is not accepting stories yet. Check Supabase anonymous sign-in and RLS.'
  }

  return message
}
