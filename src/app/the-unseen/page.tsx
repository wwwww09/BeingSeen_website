import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'The Unseen',
  description:
    'An anonymous message board: leave a story of a time you felt unseen, and light up a star.',
}

/**
 * 留言板（The Unseen）。
 *
 * 按新纲要, 这一页的星图要把两类天体合到一个空间里:
 *   - 透镜系统（多, 暗）
 *   - FRB（少, 更暗）
 * 故事星放在高赤纬的暗区。
 *
 * 本阶段先把外壳、引言和入口立起来; 3D 星图与提交交互在下一阶段接上
 * （要接 Supabase）。
 */
export default function TheUnseenPage() {
  return (
    <main className="page">
      <section className="section">
        <div className="section__inner">
          <p className="eyebrow">The Unseen</p>
          <h1 className="h1">A Star for the Unseen</h1>
          <p className="lede">
            Gravitational lensing magnifies the faint light of distant stars. Here, your
            empathy is the lens. By sharing your story, you light up a star that was once
            lost in the dark.
          </p>
          <p className="lede">
            The interactive star map is being rebuilt for this page. Until it is ready, the
            three science pages are the place to start.
          </p>
          <Link href="/lensing-supernovae" className="btn btn--ghost">
            The Science <span className="btn__arrow">→</span>
          </Link>
        </div>
      </section>
    </main>
  )
}
