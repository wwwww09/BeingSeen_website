import Link from 'next/link'
import type { Metadata } from 'next'
import { FilmProgressDots } from '@/components/film/scroll'

export const metadata: Metadata = {
  title: 'Being Seen',
  description:
    'Some stars are invisible. Not because they do not exist, but because they are in the wrong place, at the wrong time, or emit the wrong kind of light.',
}

/**
 * 首页 —— 一部五幕的单页电影。
 *
 * 文案来自《网页布局大纲》的「首页文案重构」, 分幕来自「网页分镜设计」。
 * 两者是同一件事的两面: 每一幕的正文就是一段文案, 背景的三维场景随滚动
 * 进度演到对应的一幕 (见 components/film/FilmCanvas.tsx)。
 *
 *   第一幕 Overview      全景星场
 *   第二幕 Intrinsic     镜头推进 -> 暗星坍缩成黑洞
 *   第三幕 Temporal      拉远 -> 星点重排成 FRB 散点, 一个点在毫秒间闪灭
 *   第四幕 Extrinsic     透镜星系 + 爱因斯坦环 + 被放大的超新星
 *   第五幕 Human         回到宏观, 暗区等待被点亮 -> 留言板
 */
export default function HomePage() {
  return (
    <>
      <FilmProgressDots />

      <main className="film">
        {/* ---------------------------------------------------------- 第一幕 */}
        <section className="act act--center" id="overview">
          <div className="act__body">
            <span className="hero__badge">A journey through the unseen</span>
            <h1 className="act__title">Being Seen</h1>

            <p className="act__lede">
              Some stars are invisible. Not because they don&rsquo;t exist, but because
              they are in the wrong place, at the wrong time, or emit the wrong kind of
              light.
            </p>
            <p className="act__lede">
              We spend our lives looking up, trying to understand the universe. But what if
              the universe is also trying to be seen? What does it mean for a cosmic event
              — or a person — to be truly <em>witnessed</em>?
            </p>

            <div className="hero__actions">
              <Link href="/lensing-supernovae" className="btn btn--gold">
                Explore the Science <span className="btn__arrow">→</span>
              </Link>
              <Link href="/the-unseen" className="btn btn--ghost">
                Share Your Story <span className="btn__arrow">↗</span>
              </Link>
            </div>
          </div>

          <div className="scroll-hint">Scroll</div>
        </section>

        {/* ---------------------------------------------------------- 第二幕 */}
        <section className="act act--left" id="intrinsic">
          <div className="act__body">
            <p className="act__eyebrow">01 · Intrinsic</p>
            <h2 className="act__title act__title--sm">The Nature</h2>
            <p className="act__lede">
              A stellar black hole is what is left after a massive star collapses. Its
              gravity is so strong that not even light escapes. Nothing comes out, so
              nothing can be seen. We only know they are there because of how they pull on
              everything around them.
            </p>
            <p className="act__lede">
              <strong>Astro:</strong> stellar black holes emit no light.
            </p>
            <p className="act__lede">
              <strong>Human:</strong> sometimes, the deepest parts of us remain unseen, no
              matter how hard we try to show them.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- 第三幕 */}
        <section className="act act--right" id="temporal">
          <div className="act__body">
            <p className="act__eyebrow">02 · Temporal</p>
            <h2 className="act__title act__title--sm">The Timing</h2>
            <p className="act__lede">
              A fast radio burst is a flash of radio light from another galaxy. It lasts a
              few milliseconds. If the telescope is not pointing at that patch of sky at
              that exact moment, the signal is simply gone.
            </p>
            <p className="act__lede">
              <strong>Astro:</strong> fast radio bursts last only milliseconds. If our
              telescopes blink, we miss them.
            </p>
            <p className="act__lede">
              <strong>Human:</strong> sometimes, we are only visible for a brief moment. If
              the world isn&rsquo;t looking at exactly the right time, our signal is lost.
            </p>
            <Link href="/lensing-frbs" className="btn btn--ghost">
              What we found in 536 bursts <span className="btn__arrow">→</span>
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------------- 第四幕 */}
        <section className="act act--left" id="extrinsic">
          <div className="act__body">
            <p className="act__eyebrow">03 · Extrinsic</p>
            <h2 className="act__title act__title--sm">The Distance &amp; Obstacles</h2>
            <p className="act__lede">
              <strong>Astro:</strong> light gets absorbed, diluted, or too faint to reach
              us.
            </p>
            <p className="act__lede">
              <strong>Human:</strong> sometimes, we are shouting, but the distance or the
              noise of the environment makes us fade into the background.
            </p>

            <hr className="rule" />

            <p className="act__eyebrow">How we fight back</p>
            <p className="act__lede">
              But the universe provides its own telescope. Massive galaxies bend the light
              of distant, invisible events, acting as a giant magnifying glass. This is{' '}
              <strong>Gravitational Lensing</strong>. We use it to catch what would
              otherwise be completely lost.
            </p>
            <p className="act__lede">
              <strong>Human:</strong> what is our lens? <em>Attention. Empathy.</em> When
              someone truly pays attention to you, your signal gets magnified. You become
              visible.
            </p>
            <Link href="/lensing-supernovae" className="btn btn--ghost">
              See the lens at work <span className="btn__arrow">→</span>
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------------- 第五幕 */}
        <section className="act act--center" id="a-star">
          <div className="act__body">
            <p className="act__eyebrow">05 · The Human Connection</p>
            <h2 className="act__title act__title--sm">A Star for the Unseen</h2>

            <p className="act__lede">The sky is full of missed signals. So are we.</p>
            <p className="act__lede">
              We&rsquo;ve built an anonymous message board. Pick a dark, unobserved star on
              our map, and leave a story of a time you felt unseen. When you submit it,{' '}
              <strong>the star will light up</strong>.
            </p>
            <p className="act__lede">
              Let the universe hold the things we couldn&rsquo;t see.
            </p>

            <div className="hero__actions">
              <Link href="/the-unseen" className="btn btn--gold">
                Share Your Story <span className="btn__arrow">↗</span>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
