import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMotionValue } from 'framer-motion'
import { FigureCanvas } from '../figure/FigureScene'
import { smoothstep } from '../figure/pose'

const DEMO_SECONDS = 4.2

/**
 * Unlisted prototype page. The point is to judge whether the figure reads as a
 * person before the five-act homepage is built on top of it.
 */
export function FigurePreviewPage() {
  const [params] = useSearchParams()
  const collapse = useMotionValue(Number(params.get('collapse') ?? 0))
  const [value, setValue] = useState(Number(params.get('collapse') ?? 0))
  const [running, setRunning] = useState(params.get('running') !== '0')
  const raf = useRef<number | null>(null)

  const setCollapse = useCallback(
    (next: number) => {
      const clamped = Math.min(1, Math.max(0, next))
      collapse.set(clamped)
      setValue(clamped)
    },
    [collapse],
  )

  const stopDemo = useCallback(() => {
    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [])

  const playDemo = useCallback(() => {
    stopDemo()
    setRunning(false)
    const start = performance.now()
    const tick = (now: number) => {
      const t = ((now - start) / 1000) % DEMO_SECONDS
      let v: number
      if (t < 2.1) v = t / 2.1
      else if (t < 2.7) v = 1
      else if (t < 4.1) v = 1 - (t - 2.7) / 1.4
      else v = 0
      setCollapse(smoothstep(v))
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
  }, [setCollapse, stopDemo])

  const demo = params.get('demo')
  useEffect(() => {
    if (demo === '1') playDemo()
    return stopDemo
  }, [demo, playDemo, stopDemo])

  return (
    <main className="figure-preview">
      <div className="figure-preview__canvas">
        <FigureCanvas collapse={collapse} running={running} />
      </div>

      <header className="figure-preview__head">
        <p className="eyebrow">Figure prototype · unlisted</p>
        <h1 className="figure-preview__title">Does this read as a person?</h1>
        <p className="figure-preview__note">
          A capsule skeleton with a particle shell. Drag the slider from run to
          collapse; the black hole forms in the chest. This is the only thing in
          this pass — the five acts come after your call on the figure.
        </p>
      </header>

      <div className="figure-preview__controls">
        <label className="figure-preview__label" htmlFor="collapse">
          Run <span aria-hidden="true">→</span> Collapse
        </label>
        <input
          id="collapse"
          className="figure-preview__range"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(event) => {
            stopDemo()
            setCollapse(Number(event.target.value))
          }}
        />
        <span className="figure-preview__readout">{value.toFixed(2)}</span>

        <div className="figure-preview__buttons">
          <button
            type="button"
            className="figure-link"
            onClick={() => {
              stopDemo()
              setCollapse(0)
            }}
          >
            Run
          </button>
          <button
            type="button"
            className="figure-link"
            onClick={() => {
              stopDemo()
              setCollapse(1)
            }}
          >
            Collapse
          </button>
          <button
            type="button"
            className="figure-link"
            onClick={() => {
              stopDemo()
              setRunning((r) => !r)
            }}
          >
            {running ? 'Pause stride' : 'Play stride'}
          </button>
          <button type="button" className="figure-link" onClick={playDemo}>
            Play demo
          </button>
        </div>
      </div>

      <Link className="figure-preview__back" to="/">
        ← Back to site
      </Link>
    </main>
  )
}
