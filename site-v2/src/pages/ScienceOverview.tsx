import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { science, scienceChapters } from '../content'

export function ScienceOverview() {
  const reduced = useReducedMotion() ?? false

  return (
    <>
      <section className="page-head" data-side="left">
        <div className="page-head__inner">
          <motion.p
            className="eyebrow"
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            {science.eyebrow}
          </motion.p>
          <motion.h1
            className="page-title"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            The Science
          </motion.h1>
          <p className="page-subtitle">{science.title}</p>
          <span className="chapter__rule" aria-hidden="true" />
          <motion.p
            className="page-lede"
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {science.lede}
          </motion.p>
        </div>
      </section>

      <section className="index-section" data-side="left">
        <div className="index-section__inner">
          <p className="section-kicker">Three chapters</p>
          <div className="index-list">
            {scienceChapters.map((chapter) => (
              <Link
                key={chapter.slug}
                to={`/science/${chapter.slug}`}
                className="index-row"
              >
                <span className="index-row__n">{chapter.index}</span>
                <span className="index-row__main">
                  <span className="index-row__kicker">{chapter.kicker}</span>
                  <span className="index-row__title">{chapter.title}</span>
                  <span className="index-row__summary">{chapter.summary}</span>
                </span>
                <span className="index-row__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
