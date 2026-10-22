import { motion, useReducedMotion } from 'framer-motion'
import { Link, Navigate, useParams } from 'react-router-dom'
import { scienceChapters } from '../content'

export function ScienceChapterPage() {
  const { slug } = useParams<{ slug: string }>()
  const reduced = useReducedMotion() ?? false

  const index = scienceChapters.findIndex((chapter) => chapter.slug === slug)
  if (index === -1) return <Navigate to="/science" replace />

  const chapter = scienceChapters[index]
  const next = scienceChapters[index + 1]
  const headSide = chapter.index === '02' ? 'right' : 'left'
  const dataSide = headSide === 'left' ? 'right' : 'left'

  return (
    <>
      <section className={`page-head page-head--${headSide}`} data-side={headSide}>
        <div className="page-head__inner">
          <p className="eyebrow">
            The Science <span aria-hidden="true">/</span> {chapter.index}
          </p>
          <motion.h1
            className="page-title"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            {chapter.title}
          </motion.h1>
          <span className="chapter__rule" aria-hidden="true" />
          <p className="page-lede">{chapter.body}</p>
        </div>
      </section>

      <section className={`science-data science-data--${dataSide}`} data-side={dataSide}>
        <div className="science-data__inner">
          <p className="section-kicker">The data</p>
          <h2 className="science-data__title">{chapter.chartLabel}</h2>
          <p className="science-data__note">{chapter.chartNote}</p>

          <div
            className="chart-frame"
            role="img"
            aria-label={`${chapter.chartLabel} — chart placeholder for the next pass`}
          >
            <span className="chart-frame__label">Chart frame · next pass</span>
          </div>

          <p className="science-data__todo">
            The chart and its numbers arrive in the next pass.
          </p>

          <div className="chapter-next">
            {next ? (
              <Link className="next-link" to={`/science/${next.slug}`}>
                <span className="next-link__label">Next chapter</span>
                <span className="next-link__title">
                  {next.title} <span aria-hidden="true">→</span>
                </span>
              </Link>
            ) : (
              <Link className="next-link" to="/message-board">
                <span className="next-link__label">After the science</span>
                <span className="next-link__title">
                  The Message Board <span aria-hidden="true">→</span>
                </span>
              </Link>
            )}
            <Link className="back-link" to="/science">
              All chapters
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
