import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Nav } from '../components/Nav'
import { useWebGL } from '../lib/useWebGL'

const FilmScene = lazy(() =>
  import('../film/FilmScene').then((module) => ({ default: module.FilmScene })),
)

function FilmText({
  progress,
  range,
  children,
  hero = false,
  cta = false,
  hold = false,
}: {
  progress: MotionValue<number>
  range: [number, number]
  children: ReactNode
  hero?: boolean
  cta?: boolean
  hold?: boolean
}) {
  const [start, end] = range
  const opacity = useTransform(
    progress,
    [start, start + 0.015, end - 0.02, end],
    [hero ? 1 : 0, 1, 1, hold ? 1 : 0],
  )
  const y = useTransform(progress, [start, end], [16, -16])

  return (
    <motion.div
      className={`film__text${hero ? ' film__text--hero' : ''}${
        cta ? ' film__text--cta' : ''
      }`}
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
      <span className="film__rail-title">A film in four parts</span>
      <div className="film__rail-track">
        <motion.div className="film__rail-fill" style={{ scaleY }} />
      </div>
      <div className="film__rail-acts">
        <span>I</span>
        <span>II</span>
        <span>III</span>
        <span>IV</span>
      </div>
    </div>
  )
}

/**
 * The complete five-stage film. The Canvas and the text are fixed; a tall
 * invisible track supplies the scroll. Moving the scrollbar runs the camera,
 * the figure, the magnetar flash, the crowd and the final starfield.
 */
export function HomePage() {
  const trackRef = useRef<HTMLDivElement>(null)
  const webgl = useWebGL()
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })
  const flash = useTransform(
    scrollYProgress,
    [0.435, 0.452, 0.468, 0.49],
    [0, 0.9, 0.55, 0],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="film">
      <div className={`film__canvas${webgl !== true ? ' film__canvas--fallback' : ''}`}>
        {webgl === true ? (
          <Suspense fallback={null}>
            <FilmScene progress={scrollYProgress} />
          </Suspense>
        ) : null}
      </div>

      <div className="film__scrim" aria-hidden="true" />
      <motion.div className="film__flash" style={{ opacity: flash }} aria-hidden="true" />

      <Nav progress={scrollYProgress} />

      <main id="main" className="film__overlay">
        <FilmText progress={scrollYProgress} range={[0, 0.13]} hero>
          <p className="eyebrow">A journey through the unseen</p>
          <h1 className="film__title">Being unseen</h1>
          <div className="film__hook">
            <p>
              Some stars are invisible. Not because they don't exist, but because
              they are in the wrong place, at the wrong time, or emit the wrong
              kind of light.
            </p>
            <p>
              We spend our lives looking up, trying to understand the universe.
              But what if the universe is also trying to be seen? What does it
              mean for a cosmic event — or a person — to be truly{' '}
              <em>witnessed</em>?
            </p>
            <p>
              To answer this, we must look at how the universe hides its own
              light. It turns out, the reasons a cosmic event goes unseen are the
              exact same reasons we, as humans, sometimes feel invisible.
            </p>
          </div>
          <p className="film__lead">Invisibility takes three forms:</p>
          <p className="film__scroll">
            Scroll <span aria-hidden="true" />
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.13, 0.245]}>
          <p className="film__chapter">
            01 <span>The Intrinsic</span>
          </p>
          <p className="film__quote">
            “Sometimes, the deepest parts of us remain unseen, no matter how hard
            we try to show them.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.245, 0.345]}>
          <p className="film__chapter">
            01 <span>The Intrinsic</span>
          </p>
          <p className="film__body">
            Here, in the cosmos, stellar black holes emit no light either. They
            exist and they are completely dark.
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.35, 0.455]}>
          <p className="film__chapter">
            02 <span>The Temporal</span>
          </p>
          <p className="film__quote">
            “Fast Radio Bursts (FRBs) last only milliseconds. If our telescopes
            blink, we miss them forever.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.455, 0.56]}>
          <p className="film__chapter">
            02 <span>The Temporal</span>
          </p>
          <p className="film__body">
            Sometimes, we are only visible for a brief moment. He looks around,
            hoping someone saw. But the world wasn't looking at exactly the right
            time. His signal is lost.
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.57, 0.685]}>
          <p className="film__chapter">
            03 <span>The Extrinsic</span>
          </p>
          <p className="film__quote">
            “Sometimes, we are shining, but the distance or the noise of the
            environment makes us fade into the background.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.685, 0.78]}>
          <p className="film__chapter">
            03 <span>The Extrinsic</span>
          </p>
          <p className="film__body">
            Out in the universe, light gets absorbed, diluted, or too faint to
            reach us across billions of light-years.
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.78, 0.9]}>
          <p className="film__chapter">
            04 <span>The Unseen</span>
          </p>
          <p className="film__quote">
            “We are made of stardust, yet we share the same blindness as the
            cosmos.”
          </p>
        </FilmText>

        <FilmText progress={scrollYProgress} range={[0.91, 1]} cta hold>
          <p className="film__chapter">the science</p>
          <p className="film__cta-line">Interested in the theory behind? click</p>
          <Link className="film__cta" to="/science">
            Explore the Science <span aria-hidden="true">↗</span>
          </Link>
        </FilmText>

        <FilmRail progress={scrollYProgress} />
      </main>

      <div ref={trackRef} className="film__track" aria-hidden="true" />
    </div>
  )
}
