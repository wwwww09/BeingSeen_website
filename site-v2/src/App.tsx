import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { chapters } from './content'
import { Nav } from './components/Nav'
import { ProgressRail } from './components/ProgressRail'
import type { TextSide } from './scene/LensCore'

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
  const [textSide, setTextSide] = useState<TextSide>('left')

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  /*
   * Which half of the screen the reader is currently reading. The lens sits on
   * the other half, so it never sits directly under a paragraph. Intersection
   * Observer is used instead of scroll arithmetic: the sections keep their own
   * height, and the side stays correct when the copy grows.
   */
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-side]'),
    )
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const side = entry.target.getAttribute('data-side')
          if (side === 'left' || side === 'right') setTextSide(side)
        }
      },
      { rootMargin: '-46% 0px -46% 0px', threshold: 0 },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
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
        <Stage progress={scrollYProgress} textSide={textSide} />
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
              A serious game · skeleton 0.1
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
              className="hero__lede"
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              A scrolling story about bent light, late arrivals, and the things
              that only become visible when something gets in the way.
            </motion.p>

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
            <p className="eyebrow">End of the skeleton</p>
            <p className="outro__line">
              The stage is live. The five chapters, the charts, and the guestbook
              come next.
            </p>
            <p className="outro__meta">
              Stage · React Three Fiber &nbsp;/&nbsp; Motion · Framer Motion
              &nbsp;/&nbsp; Data · Supabase (next)
            </p>
          </motion.div>
        </footer>
      </main>
    </div>
  )
}
