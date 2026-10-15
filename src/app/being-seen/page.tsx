import type { Metadata } from 'next'
import Guestbook from '@/components/Guestbook'
import { isSupabaseConfigured } from '@/lib/supabase'

/**
 * 留言板页面。
 *
 * 故事数据一律在客户端读取 (用可公开的 key + RLS 的 select 策略)。
 * 这样同一份代码在两种部署形态下都能工作:
 *   - 正常部署 (serverless): 有 /api/stories 负责写入
 *   - 静态导出: 没有服务端, 改为客户端直连写入
 *     (需要执行 supabase/schema-public-insert.sql)
 *
 * 读取不需要服务端参与, 所以本页可以静态预渲染。
 */

export const metadata: Metadata = {
  title: 'Being Seen',
  description:
    'Every dim star here represents an object in the universe that has not yet been fully seen. Leave an anonymous story about a moment when you felt unseen.',
}

export default function BeingSeenPage() {
  const configured = isSupabaseConfigured()

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
        <Guestbook configured={configured} />
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
