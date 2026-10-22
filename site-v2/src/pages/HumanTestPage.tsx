import { useState } from 'react'
import { Link } from 'react-router-dom'
import { HumanTestScene } from '../humanTest/HumanTestScene'

/**
 * Isolated verification page. The Home film is untouched.
 * Step 1: one Points cloud, a clear standing human, no animation.
 * Step 2: press Run for a simple forward lean, reaching hand and leg swing,
 * all in the vertex shader — no gravity, jitter, black holes or postprocessing.
 */
export function HumanTestPage() {
  const [running, setRunning] = useState(false)

  return (
    <main className="human-test">
      <div className="human-test__canvas">
        <HumanTestScene running={running} />
      </div>

      <header className="human-test__head">
        <p className="eyebrow">Particle human · isolated test</p>
        <h1 className="human-test__title">One cloud. One silhouette.</h1>
        <p className="human-test__note">
          Step 1 is a single <code>THREE.Points</code> cloud forming a clear
          standing human. Step 2 is only a simple run: forward lean, one hand
          reaching, opposing leg swing, all basic vertex-shader math. No noise,
          jitter, gravity, black holes or postprocessing.
        </p>
      </header>

      <div className="human-test__controls">
        <button
          type="button"
          className={`human-test__button${running ? '' : ' is-active'}`}
          onClick={() => setRunning(false)}
        >
          Stand
        </button>
        <button
          type="button"
          className={`human-test__button${running ? ' is-active' : ''}`}
          onClick={() => setRunning(true)}
        >
          Run
        </button>
        <span className="human-test__state">{running ? 'running' : 'standing'}</span>
      </div>

      <Link className="human-test__back" to="/">
        ← Back to site
      </Link>
    </main>
  )
}
