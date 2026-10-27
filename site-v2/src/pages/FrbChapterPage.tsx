import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ScienceChapter } from '../content'
import { FrbMechanism3D } from '../components/FrbMechanism3D'
import { FrbDataMap3D } from '../components/FrbDataMap3D'
import { FrbSearchSection } from '../components/FrbSearchSection'

/**
 * Chapter 02 — the FRB lensing mechanism.
 *
 * The hero and mechanism are followed by the real catalogue: every plotted
 * FRB, with the four bursts that form the two candidate lensed pairs.
 */
export function FrbChapterPage({
  chapter,
  reduced,
}: {
  chapter: ScienceChapter
  reduced: boolean
}) {
  return (
    <article className="frb-page">
      <header className="frb-hero">
        <p className="eyebrow">
          The Science <span aria-hidden="true">/</span> {chapter.index}
        </p>
        <motion.h1
          className="frb-title"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          {chapter.title}
        </motion.h1>
        <span className="chapter__rule" aria-hidden="true" />
        <motion.p
          className="frb-lede"
          initial={reduced ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {chapter.body}
        </motion.p>
      </header>

      <section className="frb-mechanism">
        <p className="section-kicker">The physics</p>
        <h2 className="frb-section-title">The Mechanism</h2>

        <div
          className="frb-scene"
          role="img"
          aria-label="Schematic of a fast radio burst lensed by a massive galaxy. A yellow source on the right sends a faint blue direct path and a curved golden delayed path to Earth on the left. The two signals arrive 24.9 days apart."
        >
          <FrbMechanism3D animate={!reduced} />
        </div>

        <p className="frb-caption">
          Same signal, different paths.{' '}
          <span className="frb-caption__delay">
            Time Delay = <b>24.9 days</b>
          </span>
        </p>

        <ul className="frb-legend" aria-label="Diagram legend">
          <li>
            <i className="frb-dot frb-dot--source" aria-hidden="true" />
            FRB source
          </li>
          <li>
            <i className="frb-dot frb-dot--lens" aria-hidden="true" />
            Lensing galaxy
          </li>
          <li>
            <i className="frb-dot frb-dot--earth" aria-hidden="true" />
            Earth
          </li>
          <li>
            <i className="frb-line frb-line--direct" aria-hidden="true" />
            Direct path
          </li>
          <li>
            <i className="frb-line frb-line--delayed" aria-hidden="true" />
            Delayed path
          </li>
        </ul>
      </section>

      <section className="frb-data">
        <p className="section-kicker">The real data</p>
        <h2 className="frb-data-title">
          Out of 690 detected FRBs,
          <br />
          <span className="frb-data-title__accent">547</span> have complete{' '}
          <span className="frb-data-title__accent">DM data</span>.
        </h2>
        <p className="frb-data-lede">
          We tested those 547 and found 2 candidate pairs whose bursts share the
          same dispersion measure (DM) but arrived days apart.
        </p>
        <FrbDataMap3D />
      </section>

      <FrbSearchSection />

      <div className="frb-next">
        <Link className="back-link" to="/science">
          All chapters
        </Link>
      </div>

      <footer className="frb-footer">
        Being Seen <span aria-hidden="true">/</span> The Science{' '}
        <span aria-hidden="true">/</span> Fast radio bursts
      </footer>
    </article>
  )
}
