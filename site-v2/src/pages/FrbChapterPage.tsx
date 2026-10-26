import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { ScienceChapter } from '../content'
import { FrbMechanism3D } from '../components/FrbMechanism3D'

/**
 * Chapter 02 — the FRB lensing mechanism.
 *
 * This pass builds the hero and the standalone 3D geometry: a source on the
 * right, a lensing galaxy in the middle, Earth on the left, and the direct and
 * delayed signal paths. The catalogue search arrives in the next pass.
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
