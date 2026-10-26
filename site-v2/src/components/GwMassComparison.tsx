import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { GW_EVENTS, GW_Y_MAX, MASS_GAP } from '../data/gw-events'

const W = 1000
const H = 460
const PAD = { left: 64, right: 190, top: 62, bottom: 82 }
const PLOT_W = W - PAD.left - PAD.right
const BASE = H - PAD.bottom
const PLOT_H = BASE - PAD.top
const EVENT_W = PLOT_W / GW_EVENTS.length
const SUB_W = EVENT_W / 2
const BAR_W = 54
const BAR_GAP = 8

const Y_TICKS = [0, 20, 40, 60, 80]
const COMPONENTS: Array<'m1' | 'm2'> = ['m1', 'm2']

const yOf = (mass: number) => BASE - (mass / GW_Y_MAX) * PLOT_H
const eventCenter = (index: number) => PAD.left + EVENT_W * (index + 0.5)
const subCenter = (eventIndex: number, componentIndex: number) =>
  eventCenter(eventIndex) + (componentIndex === 0 ? -1 : 1) * (SUB_W / 2)
const barX = (
  eventIndex: number,
  componentIndex: number,
  barIndex: number,
) =>
  subCenter(eventIndex, componentIndex) +
  (barIndex === 0 ? -1 : 1) * ((BAR_W + BAR_GAP) / 2) -
  BAR_W / 2

const GAP_Y = yOf(MASS_GAP)

/**
 * M1 vs M2, observed vs de-lensed.
 *
 * Each event gets two subgroups, one for each component mass, and each subgroup
 * gets a red observed bar and a blue de-lensed bar. This keeps all four masses
 * in one view while preserving the event-level comparison.
 */
export function GwMassComparison() {
  const uid = useId().replace(/:/g, '')
  const reduced = useReducedMotion() ?? false

  return (
    <figure className="gw-compare">
      <div className="gw-compare__scroller">
        <div className="gw-compare__inner">
          <svg
            className="gw-compare__svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby={`${uid}-title`}
            aria-describedby={`${uid}-desc`}
          >
            <title id={`${uid}-title`}>
              Observed and de-lensed black hole masses for GW241230 and GW241125
            </title>
            <desc id={`${uid}-desc`}>
              Grouped bars for the two component masses of each event. The
              observed masses sit above the red 45 solar-mass mass-gap line; the
              de-lensed masses fall below it.
            </desc>

            <defs>
              <linearGradient
                id={`${uid}-observed`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="#c85462" />
                <stop offset="100%" stopColor="#7c2632" />
              </linearGradient>
              <linearGradient id={`${uid}-true`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4d89c8" />
                <stop offset="100%" stopColor="#234366" />
              </linearGradient>
            </defs>

            {Y_TICKS.map((value) => (
              <g key={value}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + PLOT_W}
                  y1={yOf(value)}
                  y2={yOf(value)}
                  stroke="rgba(245,245,245,0.06)"
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 14}
                  y={yOf(value)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="gw-compare__tick"
                >
                  {value}
                </text>
              </g>
            ))}

            <text
              x={PAD.left}
              y={PAD.top - 24}
              textAnchor="start"
              className="gw-compare__axis-title"
            >
              Mass (M⊙)
            </text>

            <motion.line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={GAP_Y}
              y2={GAP_Y}
              stroke="#d65a5a"
              strokeWidth={1.3}
              strokeDasharray="7 6"
              initial={reduced ? false : { opacity: 0 }}
              whileInView={reduced ? undefined : { opacity: 1 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <text
              x={PAD.left + PLOT_W + 16}
              y={GAP_Y - 4}
              className="gw-compare__gap-label"
            >
              Mass Gap
            </text>
            <text
              x={PAD.left + PLOT_W + 16}
              y={GAP_Y + 12}
              className="gw-compare__gap-label"
            >
              Boundary · 45 M⊙
            </text>

            {GW_EVENTS.map((event, eventIndex) => (
              <g key={event.id}>
                {COMPONENTS.map((componentKey, componentIndex) => {
                  const component = event[componentKey]
                  const observedX = barX(eventIndex, componentIndex, 0)
                  const trueX = barX(eventIndex, componentIndex, 1)
                  const observedY = yOf(component.observed)
                  const trueY = yOf(component.corrected)
                  const observedH = BASE - observedY
                  const trueH = BASE - trueY
                  const delay = 0.08 * eventIndex + 0.06 * componentIndex

                  const barMotion = (
                    y: number,
                    height: number,
                  ) =>
                    reduced
                      ? {
                          initial: false,
                          animate: { y, height },
                        }
                      : {
                          initial: { y: BASE, height: 0 },
                          whileInView: { y, height },
                          viewport: { once: true, amount: 0.35 },
                          transition: {
                            duration: 0.9,
                            delay,
                            ease: [0.22, 1, 0.36, 1] as [
                              number,
                              number,
                              number,
                              number,
                            ],
                          },
                        }

                  return (
                    <g key={componentKey}>
                      <motion.rect
                        x={observedX}
                        width={BAR_W}
                        rx={1}
                        fill={`url(#${uid}-observed)`}
                        {...barMotion(observedY, observedH)}
                      />
                      <motion.rect
                        x={trueX}
                        width={BAR_W}
                        rx={1}
                        fill={`url(#${uid}-true)`}
                        {...barMotion(trueY, trueH)}
                      />

                      <text
                        x={observedX + BAR_W / 2}
                        y={observedY - 9}
                        textAnchor="middle"
                        className="gw-compare__value"
                      >
                        {component.observed.toFixed(1)}
                      </text>
                      <text
                        x={trueX + BAR_W / 2}
                        y={trueY - 9}
                        textAnchor="middle"
                        className="gw-compare__value gw-compare__value--true"
                      >
                        {component.corrected.toFixed(1)}
                      </text>

                      <text
                        x={subCenter(eventIndex, componentIndex)}
                        y={BASE + 18}
                        textAnchor="middle"
                        className="gw-compare__group-label"
                      >
                        {componentIndex === 0 ? 'M1' : 'M2'}
                      </text>
                      <text
                        x={subCenter(eventIndex, componentIndex)}
                        y={BASE + 33}
                        textAnchor="middle"
                        className="gw-compare__mu"
                      >
                        μ{componentIndex + 1} {component.mu.toFixed(2)}
                      </text>
                    </g>
                  )
                })}

                <text
                  x={eventCenter(eventIndex)}
                  y={BASE + 58}
                  textAnchor="middle"
                  className="gw-compare__event"
                >
                  {event.name}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
      <p className="gw-compare__scroll-hint">Scroll the chart sideways →</p>

      <div className="gw-compare__legend" aria-label="Chart legend">
        <span>
          <i className="gw-compare__swatch gw-compare__swatch--observed" />
          Observed Mass
        </span>
        <span>
          <i className="gw-compare__swatch gw-compare__swatch--true" />
          De-lensed True Mass
        </span>
        <span>
          <i className="gw-compare__dash" />
          Mass Gap Boundary (45 M⊙)
        </span>
      </div>

      <figcaption className="gw-compare__caption">
        M1 and M2 are the two component masses of each binary. The observed
        masses sit above the 45 M⊙ mass-gap boundary; after removing the lensing
        bias, all four fall back into the normal range. The correction is a
        hypothesis test, not a measurement.
      </figcaption>
    </figure>
  )
}
