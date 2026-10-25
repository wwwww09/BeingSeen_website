import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { scienceChapters } from '../content'
import { LensScatter3D } from '../components/LensScatter3D'
import { MagnitudeChart } from '../components/MagnitudeChart'
import { SimulatedHistogram } from '../components/SimulatedHistogram'

export function ScienceChapterPage() {
  const { slug } = useParams<{ slug: string }>()
  const { hash } = useLocation()
  const reduced = useReducedMotion() ?? false

  /*
   * "#magnification" should land on the chart even on a cold load: the router
   * renders after the browser has already tried to resolve the hash, so the
   * target does not exist yet and the native jump silently does nothing.
   */
  useEffect(() => {
    if (!hash) return
    const target = document.getElementById(decodeURIComponent(hash.slice(1)))
    if (!target) return
    /*
     * The global `scroll-behavior: smooth` makes an early jump animate toward
     * a layout that is still growing, which lands nowhere. Jump instantly,
     * then correct once fonts and the canvas have settled.
     */
    const jump = () =>
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
    const frame = window.requestAnimationFrame(jump)
    const timer = window.setTimeout(jump, 300)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [hash])

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

        {/*
          The lens cloud is fixed to the right half of the viewport (see
          .sn-bg); everything here lives in the left column and simply scrolls
          past it.
        */}
        <section className="sn-section sn-mechanism" id="magnification">
          <p className="section-kicker">The mechanism</p>
          <h2 className="sn-title">The Magnification Effect</h2>
          <p className="sn-body">
            The lens does not make the explosion brighter. It makes the
            explosion appear brighter — and that is enough to cross a
            telescope’s detection limit. Each line runs from the magnitude a
            supernova would have without a lens to the magnitude the lens
            actually gives it.
          </p>
          <MagnitudeChart />
        </section>

        <section className="sn-section sn-sim">
          <p className="section-kicker">The simulation</p>
          <h2 className="sn-title">Finding a Needle in a Cosmic Haystack</h2>
          <p className="sn-body">
            We simulated 64,309 lensed systems. Most are too faint for ZTF. Only
            a tiny fraction with extreme magnification cross the detection limit.
          </p>
          <SimulatedHistogram />
          <blockquote className="sn-quote">
            “Gravitational lensing boosts supernova detection rates by at least
            an order of magnitude.”
          </blockquote>
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

        <footer className="sn-footer">
          Being Seen <span aria-hidden="true">/</span> The Science <span aria-hidden="true">/</span> Supernovae
        </footer>
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
                  We simulated 64,309 supernovae and mapped them against
                  32,838 known gravitational lenses. Only a tiny fraction align
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
