import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Nav } from '../components/Nav'
import { useWebGL } from '../lib/useWebGL'
import { ParticleScene } from '../particle/ParticleScene'

function FilmText({
  progress,
  range,
  children,
  cta = false,
  hold = false,
}: {
  progress: MotionValue<number>
  range: [number, number]
  children: ReactNode
  cta?: boolean
  hold?: boolean
}) {
  const [start, end] = range
  const opacity = useTransform(
    progress,
    [start, start + 0.014, end - 0.02, end],
    [start === 0 ? 1 : 0, 1, 1, hold ? 1 : 0],
  )
  const y = useTransform(progress, [start, end], [18, -18])

  return (
    <motion.div
      className={`film__text${cta ? ' film__text--cta' : ''}`}
      style={{ opacity, y }}
    >
      {children}
    </motion.div>
  )
}

function TextOverlay({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.02, 0.05, 0.15, 0.18], [0, 1, 1, 0])
  const y = useTransform(progress, [0.02, 0.05, 0.15, 0.18], [16, 0, 0, -12])
  return (
    <motion.div className="film__stage1" style={{ opacity, y }}>
      <p className="film__chapter">
        01 <span>The Intrinsic</span>
      </p>
      <p className="film__quote">
        “Sometimes, the deepest parts of us remain unseen, no matter how hard we
        try to show them.”
      </p>
      <p className="film__stage1-sub">
        Here, stellar black holes emit no light either.
      </p>
    </motion.div>
  )
}

function ScienceCta({ progress }: { progress: MotionValue<number> }) {
  const opacity = useTransform(progress, [0.9, 0.95], [0, 1])
  const y = useTransform(progress, [0.9, 0.95], [10, 0])
  return (
    <motion.div className="film__cta-wrap" style={{ opacity, y }}>
      <Link className="film__cta" to="/science">
        EXPLORE THE SCIENCE <span aria-hidden="true">↘</span>
      </Link>
    </motion.div>
  )
}

function FilmRail({ progress }: { progress: MotionValue<number> }) {
  const scaleY = useTransform(progress, [0, 1], [0, 1])
  return (
    <div className="film__rail" aria-hidden="true">
      <span className="film__rail-title">A film in five parts</span>
      <div className="film__rail-track">
        <motion.div className="film__rail-fill" style={{ scaleY }} />
      </div>
      <div className="film__rail-acts">
        <span>I</span>
        <span>II</span>
        <span>III</span>
        <span>IV</span>
        <span>V</span>
      </div>
    </div>
  )
}

/**
 * One continuous, single-points film. The Canvas holds exactly one
 * THREE.Points cloud; every stage is a position target array interpolated by
 * scroll. The film is read as five acts, not as five separate scenes.
 */
export function HomePage() {
  const introRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const webgl = useWebGL()
  const { scrollYProgress: introProgress } = useScroll({
    target: introRef,
    offset: ['start start', 'end start'],
  })
  const philosophyRef = useRef<HTMLElement>(null)
  const { scrollYProgress: philosophyProgress } = useScroll({
    target: philosophyRef,
    offset: ['start start', 'end end'],
  })
  const p1Opacity = useTransform(philosophyProgress, [0, 0.07, 0.26, 0.33], [0, 1, 1, 0])
  const p2Opacity = useTransform(philosophyProgress, [0.33, 0.4, 0.59, 0.66], [0, 1, 1, 0])
  const p3Opacity = useTransform(philosophyProgress, [0.66, 0.73, 0.95, 1], [0, 1, 1, 1])
  const sceneOpacity = useTransform(introProgress, [0.82, 0.99], [0, 1])
  const cosmosColor = useTransform(
    introProgress,
    [0, 0.42, 0.8],
    ['#000000', '#05060a', '#0a0a10'],
  )
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  const smooth = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    mass: 0.45,
    restDelta: 0.0005,
  })
  const flash = useTransform(
    scrollYProgress,
    [0.488, 0.496, 0.504, 0.514],
    [0, 0.58, 0.32, 0],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <div className="intro" ref={introRef}>
        <div className="intro__stars" aria-hidden="true" />

        <section className="intro__phase intro__phase--title">
          <h2 className="intro__title">Being Seen</h2>
          <p className="intro__subtitle">A journey through the unseen</p>
          <motion.div
            className="intro__scroll"
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="intro__scroll-label">SCROLL TO BEGIN</span>
            <span className="intro__arrow" aria-hidden="true" />
          </motion.div>
        </section>

        <section
          className="intro__phase intro__phase--philosophy"
          ref={philosophyRef}
        >
          <div className="philosophy__sticky">
            <motion.p className="philosophy__line" style={{ opacity: p1Opacity }}>
              Some stars are invisible. Not because they don't exist, but because
              they are in the wrong place, at the wrong time, or emit the wrong
              kind of light.
            </motion.p>
            <motion.p className="philosophy__line" style={{ opacity: p2Opacity }}>
              We spend our lives looking up, trying to understand the universe.
              But what if the universe is also trying to be seen? What does it
              mean for a cosmic event — or a person — to be truly witnessed?
            </motion.p>
            <motion.p className="philosophy__line" style={{ opacity: p3Opacity }}>
              To answer this, we must look at how the universe hides its own
              light. It turns out, the reasons a cosmic event goes unseen are the
              exact same reasons we, as humans, sometimes feel invisible.
              <span className="philosophy__final">
                Invisibility takes three forms:
              </span>
            </motion.p>
          </div>
        </section>
      </div>

      <div className="film">
      <h1 className="film__sr-title">Being unseen — a film in five parts</h1>

      <motion.div
        className={`film__canvas${webgl !== true ? ' film__canvas--fallback' : ''}`}
        style={{ opacity: sceneOpacity, backgroundColor: cosmosColor }}
      >
        {webgl === true ? <ParticleScene progress={smooth} /> : null}
      </motion.div>

      <div className="film__scrim" aria-hidden="true" />
      <motion.div className="film__flash" style={{ opacity: flash }} aria-hidden="true" />

      <Nav progress={scrollYProgress} />

      <main id="main" className="film__overlay">
        <TextOverlay progress={scrollYProgress} />

        <FilmText progress={scrollYProgress} range={[0.2, 0.4]}>
          <p className="film__chapter">
            01 <span>The Intrinsic</span>
          </p>
          <p className="film__body">
            Here, stellar black holes emit no light either. They exist, but they
            are completely dark.
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.4, 0.6]}>
          <p className="film__chapter">
            02 <span>The Temporal</span>
          </p>
          <p className="film__quote">
            “Fast Radio Bursts (FRBs) last only milliseconds. If our telescopes
            blink, we miss them forever.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.6, 0.8]}>
          <p className="film__chapter">
            03 <span>The Extrinsic</span>
          </p>
          <p className="film__quote">
            “Sometimes, we are shining, but the distance or the noise of the
            environment makes us fade into the background.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.8, 1]} hold>
          <p className="film__chapter">
            04 <span>The Universe</span>
          </p>
          <p className="film__quote">
            “We are made of stardust, yet we share the same blindness as the
            cosmos.”
          </p>
        </FilmText>

        <ScienceCta progress={scrollYProgress} />

        <FilmRail progress={scrollYProgress} />
      </main>

      <div ref={trackRef} className="film__track" aria-hidden="true" />
      <div className="film__tail" aria-hidden="true" />
      </div>
    </>
  )
}
