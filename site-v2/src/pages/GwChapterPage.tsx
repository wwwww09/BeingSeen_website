import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ScienceChapter } from '../content'
import { GwMassComparison } from '../components/GwMassComparison'
import { GwMassMirage } from '../components/GwMassMirage'

/**
 * Chapter 03 — gravitational-wave lensing.
 *
 * Two apparent mass-gap black holes are treated as a lensing hypothesis. The
 * first section is an interactive mass mirage; the second compares the two
 * component masses before and after the correction.
 */
export function GwChapterPage({
  chapter,
  reduced,
}: {
  chapter: ScienceChapter
  reduced: boolean
}) {
  return (
    <article className="gw-page">
      <header className="gw-hero">
        <p className="eyebrow">
          The Science <span aria-hidden="true">/</span> {chapter.index}
        </p>
        <motion.h1
          className="gw-title"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {chapter.title}
        </motion.h1>
        <span className="chapter__rule" aria-hidden="true" />
        <motion.p
          className="gw-lede"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {chapter.body}
        </motion.p>
      </header>

      <section className="gw-section gw-mirage-section">
        <p className="section-kicker">The illusion</p>
        <h2 className="gw-section-title">The Mass Mirage</h2>
        <p className="gw-section-lede">
          Two events sit above the 45 M⊙ mass gap. That is what the observed
          signal says. But a lensed signal is magnified, and magnification
          biases the inferred mass upward. Drag the correction to remove the
          bias and watch the mirage dissolve.
        </p>

        <GwMassMirage />

        <p className="gw-section-caption">
          The 45 M⊙ line is the pair-instability mass-gap boundary. Both events
          start above it; both primary masses end below it.
        </p>
      </section>

      <section className="gw-section gw-compare-section">
        <p className="section-kicker">The correction</p>
        <h2 className="gw-section-title">M1 vs M2: Before and After</h2>
        <p className="gw-section-lede">
          Each event contributes two component masses. The observed masses
          (red) sit above the boundary; the de-lensed masses (gold) return to
          the normal range. The μ values show how much magnification each
          component requires.
        </p>

        <GwMassComparison />

        <p className="gw-section-caption">
          The correction is a hypothesis test: it asks what the masses would be
          if the signal were lensed. It is not a direct measurement.
        </p>
      </section>

      <section className="gw-coda">
        <p className="section-kicker">The narrative</p>
        <blockquote className="gw-quote">
          Lensing does more than let us see farther. It can also deceive the
          eye. We thought we had found black holes that break the laws of
          physics; perhaps they were only magnified by the universe’s glass.
          Lift the lens, and we finally see them as they truly are.
        </blockquote>
        <p className="gw-coda-copy">
          The universe’s magnifying glass does not only reveal. It can also
          make an ordinary black hole look like a monster. Remove the lens, and
          the anomaly disappears.
        </p>

        <div className="gw-next">
          <Link className="next-link" to="/message-board">
            <span className="next-link__label">After the science</span>
            <span className="next-link__title">
              The Message Board <span aria-hidden="true">→</span>
            </span>
          </Link>
          <Link className="back-link" to="/science">
            All chapters
          </Link>
        </div>
      </section>

      <footer className="gw-footer">
        Being Seen <span aria-hidden="true">/</span> The Science{' '}
        <span aria-hidden="true">/</span> Gravitational waves
      </footer>
    </article>
  )
}
