import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMotionValue } from 'framer-motion'
import { FigureCanvas } from '../figure/FigureScene'

const SEQUENCE_SECONDS = 5.6

/**
 * Unlisted prototype page. The shot is deliberately simple:
 *
 *   run at the camera → camera pulls back → he sits down
 *
 * The five-act homepage is not built yet; this is the figure gate.
 */
export function FigurePreviewPage() {
  const [params] = useSearchParams()
  const initial = Number(params.get('t') ?? params.get('collapse') ?? 0)
  const progress = useMotionValue(initial)
  const [value, setValue] = useState(initial)
  const raf = useRef<number | null>(null)

  const setProgress = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, next))
      progress.set(clamped)
      setValue(clamped)
    },
    [progress],
  )

  const stopDemo = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [])

  const playSequence = useCallback(() => {
    stopDemo()
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1000 / SEQUENCE_SECONDS)
      setProgress(t)
      if (t < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        raf.current = null
      }
    }
    raf.current = requestAnimationFrame(tick)
  }, [setProgress, stopDemo])

  const demo = params.get('demo')
  useEffect(() => {
    if (demo === '1') playSequence()
    return stopDemo
  }, [demo, playSequence, stopDemo])

  return (
    <main className="figure-preview">
      <div className="figure-preview__canvas">
        <FigureCanvas progress={progress} />
      </div>

      <header className="figure-preview__head">
        <p className="eyebrow">Figure prototype · unlisted</p>
        <h1 className="figure-preview__title">Does this read as a person?</h1>
        <p className="figure-preview__note">
          A dense 3D point cloud — about 62,000 particles around a 13-bone
          skeleton, with bloom. He runs at the screen, the camera pulls back,
          and he sits. No face: that is the slightly eerie part. This is the
          gate before the five acts.
        </p>
      </header>

      <div className="figure-preview__controls">
        <label className="figure-preview__label" htmlFor="sequence">
          Run at the screen <span aria-hidden="true">→</span> camera pulls back{' '}
          <span aria-hidden="true">→</span> sit
        </label>
        <input
          id="sequence"
          className="figure-preview__range"
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={value}
          onChange={(event) => {
            stopDemo()
            setProgress(Number(event.target.value))
          }}
        />
        <span className="figure-preview__readout">{value.toFixed(2)}</span>

        <div className="figure-preview__buttons">
          <button
            type="button"
            className="figure-link"
            onClick={() => {
              stopDemo()
              setProgress(0)
            }}
          >
            Run
          </button>
          <button
            type="button"
            className="figure-link"
            onClick={() => {
              stopDemo()
              setProgress(1)
            }}
          >
            Sit
          </button>
          <button type="button" className="figure-link" onClick={playSequence}>
            Play sequence
          </button>
          <button type="button" className="figure-link" onClick={stopDemo}>
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
