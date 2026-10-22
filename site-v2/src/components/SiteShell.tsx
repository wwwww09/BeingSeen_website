import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useScroll } from 'framer-motion'
import { LENS_X, type LensKey } from '../lib/lensPath'
import { ScrollContext } from '../lib/scrollContext'
import { Nav } from './Nav'
import { ProgressRail } from './ProgressRail'

const Stage = lazy(() =>
  import('./Stage').then((module) => ({ default: module.Stage })),
)

/**
 * The persistent frame: fixed top navigation, one WebGL stage behind every
 * route, and a scroll track that the current page renders into.
 *
 * The lens path is rebuilt from the sections the current route actually
 * renders, so moving from Home to a science chapter does not leave the black
 * hole following the previous page's layout.
 */
export function SiteShell() {
  const trackRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const [lensKeys, setLensKeys] = useState<LensKey[]>([
    { p: 0, x: LENS_X },
    { p: 1, x: LENS_X },
  ])

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  })

  // A route change is a new page: start at the top before measuring it.
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

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

    // Let the route content lay out (and any font swap settle) before measuring.
    const timer = window.setTimeout(schedule, 60)
    schedule()

    const observer = new ResizeObserver(schedule)
    observer.observe(track)
    window.addEventListener('resize', schedule)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [location.pathname])

  return (
    <ScrollContext.Provider value={scrollYProgress}>
      <div className="app">
        <a className="skip-link" href="#main">
          Skip to the content
        </a>

        <Nav progress={scrollYProgress} />

        <Suspense
          fallback={<div className="stage stage--fallback" aria-hidden="true" />}
        >
          <Stage progress={scrollYProgress} lensKeys={lensKeys} />
        </Suspense>

        <div className="vignette" aria-hidden="true" />
        <ProgressRail progress={scrollYProgress} />

        <main id="main" ref={trackRef} className="track">
          <Outlet />
        </main>
      </div>
    </ScrollContext.Provider>
  )
}
