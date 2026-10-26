import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { GW_EVENTS, GW_Y_MAX, MASS_GAP } from '../data/gw-events'

const Y_TICKS = [0, 20, 40, 60, 80]
const GAP_PCT = (MASS_GAP / GW_Y_MAX) * 100

const interpolate = (from: number, to: number, t: number) => from + (to - from) * t

/**
 * The Mass Mirage.
 *
 * The two primary masses start above the 45 M⊙ mass-gap boundary. The slider
 * removes the lensing bias and the bars shrink into the safe region. The ghost
 * outline keeps the observed height visible so the correction is legible as a
 * change, not just a different number.
 */
export function GwMassMirage() {
  const reduced = useReducedMotion() ?? false
  const [correction, setCorrection] = useState(0)

  const rows = GW_EVENTS.map((event) => ({
    ...event,
    currentM1: interpolate(event.m1.observed, event.m1.corrected, correction),
    currentM2: interpolate(event.m2.observed, event.m2.corrected, correction),
  }))

  const allSafe = rows.every(
    (row) => row.currentM1 < MASS_GAP && row.currentM2 < MASS_GAP,
  )
  const aboveGap = rows.filter((row) => row.currentM1 >= MASS_GAP).length
  const progressLabel = `${Math.round(correction * 100)}%`

  return (
    <figure className="gw-mirage">
      <div className="gw-mirage__status">
        <span>
          M1 above the gap <b>{aboveGap} / {rows.length}</b>
        </span>
        <span>
          Correction <b>{progressLabel}</b>
        </span>
      </div>

      <div className="gw-mirage__plot">
        <div className="gw-mirage__y-axis" aria-hidden="true">
          {Y_TICKS.map((value) => (
            <span
              key={value}
              style={{ bottom: `${(value / GW_Y_MAX) * 100}%` }}
            >
              {value}
            </span>
          ))}
        </div>

        <div className="gw-mirage__chart">
          <div className="gw-mirage__chart-area">
            <div className="gw-mirage__danger-zone" aria-hidden="true" />
            <div className="gw-mirage__safe-zone" aria-hidden="true" />

            {Y_TICKS.slice(1).map((value) => (
              <span
                key={value}
                className="gw-mirage__gridline"
                style={{ bottom: `${(value / GW_Y_MAX) * 100}%` }}
                aria-hidden="true"
              />
            ))}

            <div
              className="gw-mirage__gap-line"
              style={{ bottom: `${GAP_PCT}%` }}
              aria-hidden="true"
            >
              <span>Mass Gap Boundary · 45 M⊙</span>
            </div>

            <div className="gw-mirage__bars">
              {rows.map((row) => {
                const currentPct = (row.currentM1 / GW_Y_MAX) * 100
                const observedPct = (row.m1.observed / GW_Y_MAX) * 100
                const safe = row.currentM1 < MASS_GAP

                return (
                  <div className="gw-mirage__column" key={row.id}>
                    <div className="gw-mirage__bar">
                      <div
                        className="gw-mirage__bar-ghost"
                        style={{ height: `${observedPct}%` }}
                        aria-hidden="true"
                      >
                        {correction > 0.02 && (
                          <span>{row.m1.observed.toFixed(1)} observed</span>
                        )}
                      </div>

                      <motion.div
                        className={`gw-mirage__bar-fill${
                          safe ? ' is-safe' : ''
                        }`}
                        initial={false}
                        animate={{ height: `${currentPct}%` }}
                        transition={
                          reduced
                            ? { duration: 0 }
                            : {
                                type: 'spring',
                                stiffness: 80,
                                damping: 18,
                                mass: 0.7,
                              }
                        }
                      >
                        <span className="gw-mirage__bar-value">
                          {row.currentM1.toFixed(1)}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="gw-mirage__event-labels">
            {rows.map((row) => (
              <div className="gw-mirage__event-label" key={row.id}>
                <strong>{row.name}</strong>
                <span>
                  M1 {row.m1.observed.toFixed(1)} → {row.m1.corrected.toFixed(1)}{' '}
                  <i>μ₁ {row.m1.mu.toFixed(2)}</i>
                </span>
                <span>
                  M2 {row.m2.observed.toFixed(1)} → {row.m2.corrected.toFixed(1)}{' '}
                  <i>μ₂ {row.m2.mu.toFixed(2)}</i>
                </span>
              </div>
            ))}
          </div>
          <p className="gw-mirage__gap-note">
            — Mass Gap Boundary · 45 M⊙
          </p>
        </div>
      </div>

      <AnimatePresence>
        {allSafe && (
          <motion.p
            className="gw-mirage__reveal"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.5 }}
            aria-live="polite"
          >
            Original Mass Revealed{' '}
            <span>(No longer a Mass Gap anomaly!)</span>
          </motion.p>
        )}
      </AnimatePresence>

      <div className="gw-mirage__controls">
        <div className="gw-mirage__slider-head">
          <span>Apply Lensing Correction (μ)</span>
          <span className="gw-mirage__slider-value">{progressLabel}</span>
        </div>
        <input
          className="gw-mirage__slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={correction}
          aria-label="Apply lensing correction"
          aria-valuetext={`${progressLabel} of the lensing bias removed`}
          onChange={(event) => setCorrection(Number(event.target.value))}
        />
        <div className="gw-mirage__scale">
          <span>Observed signal</span>
          <span>De-lensed source</span>
        </div>
      </div>

      <figcaption className="gw-mirage__caption">
        The bars show the primary mass, M1. The full M1/M2 values are listed
        below each event. The correction is a hypothesis test: it asks what the
        masses would be if the signal were lensed.
      </figcaption>
    </figure>
  )
}
