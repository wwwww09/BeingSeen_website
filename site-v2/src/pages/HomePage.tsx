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
  const trackRef = useRef<HTMLDivElement>(null)
  const webgl = useWebGL()
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
    <div className="film">
      <h1 className="film__sr-title">Being unseen — a film in five parts</h1>

      <div className={`film__canvas${webgl !== true ? ' film__canvas--fallback' : ''}`}>
        {webgl === true ? <ParticleScene progress={smooth} /> : null}
      </div>

      <div className="film__scrim" aria-hidden="true" />
      <motion.div className="film__flash" style={{ opacity: flash }} aria-hidden="true" />

      <Nav progress={scrollYProgress} />

      <main id="main" className="film__overlay">
        <FilmText progress={scrollYProgress} range={[0, 0.2]}>
          <p className="film__chapter">
            01 <span>The Intrinsic</span>
          </p>
          <p className="film__quote">
            “Sometimes, the deepest parts of us remain unseen, no matter how hard
            we try to show them.”
          </p>
          <p className="film__scroll">
            Scroll <span aria-hidden="true" />
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.2, 0.4]}>
          <p className="film__chapter">
            02 <span>The Collapse</span>
          </p>
          <p className="film__body">
            Here, stellar black holes emit no light either. They exist, but they
            are completely dark.
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.4, 0.6]}>
          <p className="film__chapter">
            03 <span>The Flash</span>
          </p>
          <p className="film__quote">
            “Fast Radio Bursts (FRBs) last only milliseconds. If our telescopes
            blink, we miss them forever.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.6, 0.8]}>
          <p className="film__chapter">
            04 <span>The Extrinsic</span>
          </p>
          <p className="film__quote">
            “Sometimes, we are shining, but the distance or the noise of the
            environment makes us fade into the background.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.8, 1]} hold>
          <p className="film__chapter">
            05 <span>The Universe</span>
          </p>
          <p className="film__quote">
            “We are made of stardust, yet we share the same blindness as the
            cosmos.”
          </p>
          <Link className="film__science-link" to="/science">
            Explore the Science <span aria-hidden="true">↘</span>
          </Link>
        </FilmText>

        <FilmRail progress={scrollYProgress} />
      </main>

      <div ref={trackRef} className="film__track" aria-hidden="true" />
      <div className="film__tail" aria-hidden="true" />
    </div>
  )
}
