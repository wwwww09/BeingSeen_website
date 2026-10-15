import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import Guestbook, { type StoryRow } from '@/components/Guestbook'
import { getSecretKey, getSupabaseUrl, isSupabaseBrowserConfigured } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'Being Seen',
  description:
    'Every dim star here represents an object in the universe that has not yet been fully seen. Leave an anonymous story about a moment when you felt unseen.',
}

// 留言板需要读取最新数据, 不做静态化
export const dynamic = 'force-dynamic'

async function loadStories(): Promise<StoryRow[]> {
  const url = getSupabaseUrl()
  const secret = getSecretKey()
  if (!url || !secret) return []

  try {
    const supabase = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data, error } = await supabase
      .from('stories')
      .select('id, body, star_index, created_at')
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('[being-seen] failed to load stories:', error.message)
      return []
    }
    return (data ?? []) as StoryRow[]
  } catch (err) {
    console.error('[being-seen] unexpected error loading stories:', err)
    return []
  }
}

export default async function BeingSeenPage() {
  const stories = await loadStories()
  const configured = isSupabaseBrowserConfigured() && Boolean(getSecretKey())

  return (
    <main className="page page--wide">
      <header style={{ maxWidth: 780 }}>
        <p className="section__label">Being Seen</p>
        <h1 className="title">Being Seen</h1>
        <p className="lede">
          Every dim star here represents an object in the universe that has not yet been
          fully seen. You can also leave an anonymous story — about a moment in your life
          when you felt unseen. Your story will not be tied to any identity; it will
          simply become the light of that star.
        </p>
      </header>

      <section className="section" style={{ marginTop: 30 }}>
        <Guestbook
          initialStories={stories}
          configured={configured}
          realtimeEnabled={configured}
        />
      </section>

      <section className="section">
        <div className="callout" style={{ maxWidth: '82ch' }}>
          <p className="callout__quote">
            This page places scientific data and human feeling in the same space. It does
            not claim they are the same thing.
          </p>
          <p className="callout__note">
            The stars above are not a sky survey. They are a field of unlit points, one
            per story, and each one only becomes visible when someone chooses to speak.
            There is no ranking, no like count, and no public profile — a story lights its
            star and nothing else. The only thing stored is the text you write and which
            star it belongs to.
          </p>
        </div>
      </section>
    </main>
  )
}
