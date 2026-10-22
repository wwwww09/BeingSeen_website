import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { chapters } from './content'
import { Nav } from './components/Nav'
import { ProgressRail } from './components/ProgressRail'
import { LENS_X, type LensKey } from './lib/lensPath'

/*
 * Three.js is ~350 KB gzipped. It is split into its own chunk so the typed
 * story paints before the scene arrives; if the chunk or WebGL fails, the text
 * is already readable on the CSS fallback.
 */
const Stage = lazy(() =>
  import('./components/Stage').then((module) => ({ default: module.Stage })),
)

export default function App() {
  const trackRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion() ?? false
  const [lensKeys, setLensKeys] = useState<LensKey[]>([
    { p: 0, x: LENS_X },
    { p: 1, x: -LENS_X },
  ])

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  /*
   * Build the lens path from where the sections actually are. Each section has
   * a data-side attribute; its centre becomes a key at the scroll fraction
   * where it sits in the middle of the viewport. The lens glides between those
   * keys, so it never jumps when a chapter changes.
   */
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0

    const measure = () => {
      const viewport = window.innerHeight
      const total = Math.max(1, track.offsetHeight - viewport)
      const sections = Array.from(
        track.querySelectorAll<HTMLElement>('[data-side]'),
      )

      const keys: LensKey[] = sections.map((section) => ({
        p: Math.min(
          1,
          Math.max(
            0,
            (section.offsetTop + section.offsetHeight / 2 - viewport / 2) / total,
          ),
        ),
        x: section.dataset.side === 'left' ? LENS_X : -LENS_X,
      }))

      if (keys.length > 0) {
        keys.sort((a, b) => a.p - b.p)
        keys[0] = { ...keys[0], p: 0 }
        keys[keys.length - 1] = { ...keys[keys.length - 1], p: 1 }
        setLensKeys(keys)
      }
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }

    schedule()
    const observer = new ResizeObserver(schedule)
    observer.observe(track)
    window.addEventListener('resize', schedule)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [])

  // The title lifts and fades as the first chapter arrives. This is the only
  // scroll-linked HTML transform; everything else is a viewport reveal, so the
  // page stays cheap to scroll.
  const heroOpacity = useTransform(scrollYProgress, [0, 0.09], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.09], [0, -70])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to the story
      </a>

      <Nav progress={scrollYProgress} />
      <Suspense fallback={<div className="stage stage--fallback" aria-hidden="true" />}>
        <Stage progress={scrollYProgress} lensKeys={lensKeys} />
      </Suspense>
      <div className="vignette" aria-hidden="true" />
      <ProgressRail progress={scrollYProgress} />

      <main id="main" ref={trackRef} className="track">
        <section className="hero" data-side="left">
          <motion.div
            className="hero__inner"
            style={reduced ? undefined : { opacity: heroOpacity, y: heroY }}
          >
            <motion.p
              className="eyebrow"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            >
              A serious game
            </motion.p>

            <motion.h1
              className="hero__title"
              initial={reduced ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              Being Seen
            </motion.h1>

            <motion.p
              className="hero__quote"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              &ldquo;The universe has its own telescope. We just need to learn how
              to look.&rdquo;
            </motion.p>

            <motion.p
              className="hero__lede"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              This project explores how gravitational lensing — the bending of
              light by massive objects — helps us detect astronomical phenomena
              that would otherwise remain invisible. From supernovae to fast
              radio bursts to gravitational waves, we quantify how much the
              universe reveals when we let it do the work.
            </motion.p>

            <motion.div
              className="hero__actions"
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <a className="hero__enter" href="#supernovae">
                Explore the Unseen <span aria-hidden="true">→</span>
              </a>
            </motion.div>

            <motion.div
              className="hero__cue"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              <span>Scroll</span>
              <i aria-hidden="true" />
            </motion.div>
          </motion.div>
        </section>

        {chapters.map((chapter, i) => (
          <section
            key={chapter.id}
            id={chapter.id}
            className={`chapter chapter--${i % 2 === 0 ? 'left' : 'right'}`}
            data-side={i % 2 === 0 ? 'left' : 'right'}
            aria-labelledby={`${chapter.id}-title`}
          >
            <motion.div
              className="chapter__inner"
              initial={reduced ? false : { opacity: 0, y: 56 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.45 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="chapter__label">
                {chapter.index} <span aria-hidden="true">/</span> {chapter.kicker}
              </p>
              <h2 id={`${chapter.id}-title`} className="chapter__title">
                {chapter.title}
              </h2>
              <span className="chapter__rule" aria-hidden="true" />
              <p className="chapter__body">{chapter.body}</p>
              {chapter.note ? (
                <p className="chapter__note">{chapter.note}</p>
              ) : null}
            </motion.div>
          </section>
        ))}

        <footer className="outro" data-side="right">
          <motion.div
            className="outro__inner"
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="eyebrow">The frame is ready</p>
            <p className="outro__line">
              The words are in place. The charts, the data, and the guestbook
              come next.
            </p>
            <p className="outro__meta">
              Stage · React Three Fiber &nbsp;/&nbsp; Motion · Framer Motion
              &nbsp;/&nbsp; Data · Supabase (later)
            </p>
          </motion.div>
        </footer>
      </main>
    </div>
  )
}
