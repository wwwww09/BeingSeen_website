import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'What this project is, where its data comes from, and how it was built.',
}

/**
 * About —— 按用户要求先做占位: 标题 + 一段说明。
 * 具体文案（作者、数据来源、致谢）等用户给出后再填。
 */
export default function AboutPage() {
  return (
    <main className="page">
      <section className="section">
        <div className="section__inner">
          <p className="eyebrow">About</p>
          <h1 className="h1">Being Seen</h1>
          <p className="lede">
            Being Seen is a serious game about the things the universe makes hard to see —
            and about the things we do the same to each other. It follows three ways an
            object can be invisible: it emits nothing, it lasts too briefly, or it is too
            far away. Then it shows the one thing that brings all three back: a lens.
          </p>
          <p className="note">The rest of this page is still being written.</p>
        </div>
      </section>
    </main>
  )
}
