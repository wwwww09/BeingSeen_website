import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMotionValue } from 'framer-motion'
import { ShotScene } from '../shot/ShotScene'

const SHOT_SECONDS = 8.5

/**
 * A focused camera/figure test, not the finished film:
 *
 * side-on run → camera dollies in → camera arcs to the front.
 *
 * Drag the slider; tell me the exact value where the shot is wrong.
 */
export function ShotPreviewPage() {
  const [params] = useSearchParams()
  const initial = Number(params.get('t') ?? 0)
  const shot = useMotionValue(initial)
  const [value, setValue] = useState(initial)
  const raf = useRef<number | null>(null)

  const setShot = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, next))
      shot.set(clamped)
      setValue(clamped)
    },
    [shot],
  )

  const stop = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [])

  const play = useCallback(() => {
    stop()
    setValue(0)
    shot.set(0)
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000 / SHOT_SECONDS)
      setShot(t)
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else raf.current = null
    }
    raf.current = requestAnimationFrame(tick)
  }, [setShot, shot, stop])

  const demo = params.get('demo')
  useEffect(() => {
    if (demo === '1') play()
    return stop
  }, [demo, play, stop])

  return (
    <main className="figure-preview">
      <div className="figure-preview__canvas">
        <ShotScene progress={shot} />
      </div>

      <header className="figure-preview__head">
        <p className="eyebrow">Shot 01 · camera test</p>
        <h1 className="figure-preview__title">Side run → front</h1>
        <p className="figure-preview__note">
          He starts running in profile. The camera slowly moves in while it
          arcs around to his front. This is only the shot; the film is not
          changed yet. Drag the slider and tell me the value where the camera,
          the direction or the distance is wrong.
        </p>
      </header>

      <div className="figure-preview__controls">
        <label className="figure-preview__label" htmlFor="shot">
          Side run <span aria-hidden="true">→</span> camera in{' '}
          <span aria-hidden="true">→</span> front
        </label>
        <input
          id="shot"
          className="figure-preview__range"
          type="range"
          min={0}
          max={1}
          step={0.002}
          value={value}
          onChange={(event) => {
            stop()
            setShot(Number(event.target.value))
          }}
        />
        <span className="figure-preview__readout">{value.toFixed(2)}</span>

        <div className="figure-preview__buttons">
          <button type="button" className="figure-link" onClick={() => { stop(); setShot(0) }}>
            Side
          </button>
          <button type="button" className="figure-link" onClick={() => { stop(); setShot(0.5) }}>
            3/4
          </button>
          <button type="button" className="figure-link" onClick={() => { stop(); setShot(1) }}>
            Front
          </button>
          <button type="button" className="figure-link" onClick={play}>
            Play
          </button>
          <button type="button" className="figure-link" onClick={stop}>
            Stop
          </button>
        </div>
      </div>

      <Link className="figure-preview__back" to="/">
        ← Back to site
      </Link>
    </main>
  )
}
