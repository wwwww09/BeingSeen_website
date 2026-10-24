import { motion, useReducedMotion } from 'framer-motion'
import { Link, Navigate, useParams } from 'react-router-dom'
import { scienceChapters } from '../content'
import { LensScatter3D } from '../components/LensScatter3D'

export function ScienceChapterPage() {
  const { slug } = useParams<{ slug: string }>()
  const reduced = useReducedMotion() ?? false

  const index = scienceChapters.findIndex((chapter) => chapter.slug === slug)
  if (index === -1) return <Navigate to="/science" replace />

  const chapter = scienceChapters[index]
  const next = scienceChapters[index + 1]
  const isSupernovae = chapter.slug === 'supernovae'
  const headSide = chapter.index === '02' ? 'right' : 'left'
  const dataSide = headSide === 'left' ? 'right' : 'left'

  if (isSupernovae) {
    return (
      <article className="sn-page">
        <div className="sn-bg" aria-hidden="true">
          <LensScatter3D />
        </div>

        <div className="sn-content">
        <header className="sn-hero">
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
        </header>

        <section className="sn-section">
          <p className="section-kicker">The mechanism</p>
          <h2 className="sn-title">The Magnification Effect</h2>
          <p className="sn-body">
            Without a cosmic lens, the supernova SN Refsdal is 25.9 magnitude,
            invisible to ZTF. But with gravitational lensing, it is magnified
            to 23.0 magnitude, crossing the threshold of detection.
          </p>
          <div className="magnitude-card magnitude-card--wide">
            <p className="magnitude-card__kicker">Apparent magnitude</p>
            <div className="magnitude-row">
              <span>Without lens</span>
              <i style={{ width: '100%' }} />
              <b>25.9</b>
            </div>
            <div className="magnitude-row magnitude-row--lensed">
              <span>With lens</span>
              <i style={{ width: '88%' }} />
              <b>23.0</b>
            </div>
            <p className="magnitude-card__note">
              Lower is brighter. 23.0 crosses the ZTF detection threshold.
            </p>
          </div>
        </section>

        <section className="sn-section">
          <p className="section-kicker">The map</p>
          <h2 className="sn-title">Finding a Needle in a Cosmic Haystack</h2>
          <p className="sn-body">
            We simulated 10,000 supernovae and mapped them against 32,838 known
            gravitational lenses. Only a tiny fraction align perfectly.
          </p>
        </section>

        <div className="chapter-next sn-next">
          <Link className="next-link" to={`/science/${next?.slug ?? ''}`}>
            <span className="next-link__label">Next chapter</span>
            <span className="next-link__title">
              {next?.title ?? 'The Science'} <span aria-hidden="true">→</span>
            </span>
          </Link>
          <Link className="back-link" to="/science">
            All chapters
          </Link>
        </div>
        </div>
      </article>
    )
  }

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

      {isSupernovae ? (
        <>
          <section className="science-split science-split--text">
            <div className="science-split__text">
              <p className="section-kicker">The mechanism</p>
              <h2 className="science-split__title">The Magnification Effect</h2>
              <p className="science-split__body">
                Without a cosmic lens, the supernova SN Refsdal is 25.9
                magnitude, invisible to ZTF. But with gravitational lensing, it
                is magnified to 23.0 magnitude, crossing the threshold of
                detection.
              </p>
            </div>
          </section>
          <section className="science-split science-split--visual">
            <div className="magnitude-card">
              <p className="magnitude-card__kicker">Apparent magnitude</p>
              <div className="magnitude-row">
                <span>Without lens</span>
                <i style={{ width: '100%' }} />
                <b>25.9</b>
              </div>
              <div className="magnitude-row magnitude-row--lensed">
                <span>With lens</span>
                <i style={{ width: '88%' }} />
                <b>23.0</b>
              </div>
              <p className="magnitude-card__note">
                Lower is brighter. 23.0 crosses the ZTF detection threshold.
              </p>
            </div>
          </section>
        </>
      ) : null}

      <section className={`science-data science-data--${dataSide}`} data-side={dataSide}>
        <div className="science-data__inner">
          <p className="section-kicker">The data</p>
          <h2 className="science-data__title">{chapter.chartLabel}</h2>
          <p className="science-data__note">{chapter.chartNote}</p>

          {isSupernovae ? (
            <>
              <div className="science-map">
                <p className="section-kicker">The map</p>
                <h2 className="science-split__title">
                  Finding a Needle in a Cosmic Haystack
                </h2>
                <p className="science-split__body">
                  We simulated 10,000 supernovae and mapped them against 32,838
                  known gravitational lenses. Only a tiny fraction align
                  perfectly.
                </p>
              </div>
              <LensScatter3D />
            </>
          ) : (
            <>
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
            </>
          )}

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
