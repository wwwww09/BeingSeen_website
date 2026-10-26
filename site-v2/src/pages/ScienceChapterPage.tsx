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
  const headSide = chapter.index === '02' ? 'right' : 'left'
  const dataSide = headSide === 'left' ? 'right' : 'left'

  if (chapter.slug === 'supernovae') {
    return (
      <article className="sn-page">
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

        {/* 01 — the lens: five supernovae and the detection-limit slider */}
        <section className="sn-section sn-mechanism" id="magnification">
          <div className="sn-copy">
            <p className="section-kicker">The mechanism</p>
            <h2 className="sn-title">The Cosmic Magnifying Glass</h2>
            <p className="sn-body">
              We sampled 5 known lensed supernovae. Lensing doesn’t make the
              explosion brighter; it bends and focuses the light. Drag the
              slider to see how lensing pulls faint signals (grey) above the ZTF
              detection limit (gold).
            </p>
          </div>
          <div className="sn-chart sn-chart--mechanism">
            <MagnitudeChart />
          </div>
        </section>

        {/* 02 — the search: the 3D catalogue map stands on its own */}
        <section className="sn-section sn-reality">
          <div className="sn-copy">
            <p className="section-kicker">The reality</p>
            <h2 className="sn-title">A Needle in a Cosmic Haystack</h2>
            <p className="sn-body">
              But how rare is this alignment? We mapped 13,941 known lenses
              across the sky. Only 5 lensed supernovae have been caught. Most
              alignments are too faint to detect.
            </p>
          </div>
          <div className="sn-map">
            <LensScatter3D />
          </div>
        </section>

        {/* 03 — the simulation: 64,309 events, then the conclusion */}
        <section className="sn-section sn-simulation">
          <div className="sn-copy">
            <p className="section-kicker">The simulation</p>
            <h2 className="sn-title">Simulating the Invisible</h2>
            <p className="sn-body">
              We ran Monte Carlo simulations for 64,309 lensing events. The vast
              majority sit below the ZTF detection limit (m = 20.5).
            </p>
          </div>
          <div className="sn-chart sn-chart--histogram">
            <SimulatedHistogram />
          </div>
          <div className="sn-conclusion-inline">
            <blockquote className="sn-quote">
              “Despite the rarity, gravitational lensing boosts our supernova
              detection rates by at least an order of magnitude.”
            </blockquote>
          </div>
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
          Being Seen <span aria-hidden="true">/</span> The Science{' '}
          <span aria-hidden="true">/</span> Supernovae
        </footer>
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
