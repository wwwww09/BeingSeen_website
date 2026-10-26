import { useId, useMemo, useState } from 'react'
import { supernovae, ZTF_LIMIT } from '../data/supernovae'

/**
 * "The Cosmic Magnifying Glass" — five real lensed supernovae under a
 * controllable magnification.
 *
 * The slider is a thought experiment: every row is shown at the same
 * magnification μ. At μ = 1 the rows sit at their unlensed magnitudes, all
 * below the ZTF limit. As μ rises, the lens adds 2.5 log₁₀ μ magnitudes and
 * pulls each row left. The two events with the largest measured magnifications
 * cross the limit; the other three remain too faint even at μ = 60.
 *
 * The measured μ for each event stays visible beneath its name, so the
 * thought experiment never hides the real catalogue values.
 */

const MAG_MIN = 17
const MAG_MAX = 28
const MU_MAX = 60
const LOG_RANGE = Math.log10(MU_MAX)

const W = 1000
const H = 430
const PAD = { left: 220, right: 80, top: 86, bottom: 78 }
const ROW = 58

const ROWS = [...supernovae].sort((a, b) => a.without_lens - b.without_lens)

const PLOT_LEFT = PAD.left
const PLOT_RIGHT = W - PAD.right
const PLOT_BOTTOM = PAD.top + (ROWS.length - 1) * ROW
const AXIS_Y = PLOT_BOTTOM + 38
const TICKS = Array.from(
  { length: MAG_MAX - MAG_MIN + 1 },
  (_, index) => MAG_MIN + index,
)

/** Larger magnitude = fainter = further right. */
const xOf = (mag: number) =>
  PLOT_LEFT + ((mag - MAG_MIN) / (MAG_MAX - MAG_MIN)) * (PLOT_RIGHT - PLOT_LEFT)

const magnitudeAt = (withoutLens: number, mu: number) =>
  withoutLens - 2.5 * Math.log10(mu)

const formatMu = (mu: number) =>
  mu < 10 ? mu.toFixed(1) : Math.round(mu).toString()

export function MagnitudeChart() {
  const uid = useId().replace(/:/g, '')
  const [position, setPosition] = useState(0)
  const mu = useMemo(() => 10 ** (position * LOG_RANGE), [position])

  const rows = useMemo(
    () =>
      ROWS.map((row) => ({
        ...row,
        current: magnitudeAt(row.without_lens, mu),
      })),
    [mu],
  )

  const visible = rows.filter((row) => row.current < ZTF_LIMIT)
  const limitX = xOf(ZTF_LIMIT)
  const bandWidth = limitX - PLOT_LEFT
  const muLabel = formatMu(mu)

  return (
    <figure className="mchart">
      <div className="mchart__scroller">
        <div className="mchart__inner">
          <svg
            className="mchart__svg"
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-labelledby={`${uid}-title`}
            aria-describedby={`${uid}-desc`}
          >
            <title id={`${uid}-title`}>
              Five lensed supernovae under a controllable magnification
            </title>
            <desc id={`${uid}-desc`}>
              The magnification slider moves five supernovae from their
              unlensed magnitudes toward brighter magnitudes. Points that cross
              the ZTF detection limit turn gold and are labelled detected.
            </desc>

            <defs>
              <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#ffe8c4" />
                <stop offset="1" stopColor="#ffcf8b" />
              </linearGradient>
              <filter
                id={`${uid}-glow`}
                x="-250%"
                y="-250%"
                width="500%"
                height="500%"
              >
                <feGaussianBlur stdDeviation="5" />
              </filter>
            </defs>

            {/* the part of the chart ZTF can actually see */}
            <rect
              x={PLOT_LEFT}
              y={PAD.top - 30}
              width={bandWidth}
              height={AXIS_Y - (PAD.top - 30)}
              fill="rgba(255, 207, 139, 0.045)"
            />
            {/* magnitude grid */}
            {TICKS.map((tick) => (
              <g key={tick}>
                <line
                  x1={xOf(tick)}
                  x2={xOf(tick)}
                  y1={PAD.top - 30}
                  y2={AXIS_Y}
                  stroke="rgba(255,255,255,0.055)"
                  strokeWidth={1}
                />
                <text
                  className="mchart__tick"
                  x={xOf(tick)}
                  y={AXIS_Y + 22}
                  textAnchor="middle"
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* legend */}
            <g className="mchart__legend">
              <circle
                cx={PLOT_RIGHT - 310}
                cy={22}
                r={4}
                fill="none"
                stroke="rgba(200,200,200,0.55)"
              />
              <text x={PLOT_RIGHT - 298} y={27}>
                unlensed
              </text>
              <circle cx={PLOT_RIGHT - 150} cy={22} r={4.5} fill="#ffcf8b" />
              <text x={PLOT_RIGHT - 138} y={27}>
                lensed / detected
              </text>
            </g>

            {/* one row per supernova */}
            {rows.map((row, index) => {
              const y = PAD.top + index * ROW
              const unlensedX = xOf(row.without_lens)
              const currentX = xOf(row.current)
              const seen = row.current < ZTF_LIMIT

              return (
                <g
                  key={row.name}
                  className={`mchart__row${seen ? ' is-seen' : ''}`}
                >
                  <text
                    className="mchart__name"
                    x={PLOT_LEFT - 26}
                    y={y + 5}
                    textAnchor="end"
                  >
                    {row.name}
                  </text>
                  <text
                    className="mchart__mu"
                    x={PLOT_LEFT - 26}
                    y={y + 23}
                    textAnchor="end"
                  >
                    measured μ = {row.magnification.toFixed(1)}×
                  </text>

                  {/* the distance the lens has moved this event */}
                  {mu > 1.005 ? (
                    <line
                      x1={unlensedX}
                      y1={y}
                      x2={currentX}
                      y2={y}
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth={1.5}
                    />
                  ) : null}

                  {/* the unlensed reference position */}
                  {mu > 1.005 ? (
                    <circle
                      cx={unlensedX}
                      cy={y}
                      r={3}
                      fill="none"
                      stroke="rgba(200,200,200,0.5)"
                      strokeWidth={1.2}
                    />
                  ) : null}

                  {seen ? (
                    <>
                      <circle
                        cx={currentX}
                        cy={y}
                        r={14}
                        fill="#ffcf8b"
                        opacity={0.2}
                        filter={`url(#${uid}-glow)`}
                      />
                      <circle
                        cx={currentX}
                        cy={y}
                        r={5}
                        fill={`url(#${uid}-gold)`}
                      />
                      <text
                        className="mchart__detected"
                        x={currentX + 13}
                        y={y - 10}
                      >
                        Detected!
                      </text>
                    </>
                  ) : (
                    <circle
                      cx={currentX}
                      cy={y}
                      r={3.4}
                      fill="#8f8f8f"
                      opacity={0.85}
                    />
                  )}
                </g>
              )
            })}

            {/* the limit */}
            <g className="mchart__limit">
              <line
                x1={limitX}
                x2={limitX}
                y1={PAD.top - 44}
                y2={AXIS_Y}
                stroke="#ff5c35"
                strokeWidth={1.25}
                strokeDasharray="3 6"
              />
              <text
                className="mchart__limit-label"
                x={limitX - 10}
                y={PAD.top - 48}
                textAnchor="end"
              >
                ZTF limit · m = {ZTF_LIMIT}
              </text>
            </g>

            {/* axis */}
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={AXIS_Y}
              y2={AXIS_Y}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={3}
            />
            <line
              x1={PLOT_LEFT}
              x2={PLOT_RIGHT}
              y1={AXIS_Y}
              y2={AXIS_Y}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth={1}
            />
            <text
              className="mchart__axis-title"
              x={(PLOT_LEFT + PLOT_RIGHT) / 2}
              y={AXIS_Y + 46}
              textAnchor="middle"
            >
              Apparent magnitude
            </text>
            <text
              className="mchart__axis-hint"
              x={PLOT_LEFT}
              y={AXIS_Y + 66}
              textAnchor="start"
            >
              ← brighter
            </text>
            <text
              className="mchart__axis-hint"
              x={PLOT_RIGHT}
              y={AXIS_Y + 66}
              textAnchor="end"
            >
              fainter →
            </text>
          </svg>
        </div>
      </div>

      <p className="mchart__scroll-hint">
        Scroll the chart sideways to see all five →
      </p>

      <div className="mchart__controls">
        <div className="mchart__slider-head">
          <span>Lensing magnification</span>
          <span className="mchart__slider-value">μ = {muLabel}×</span>
        </div>
        <input
          className="mchart__slider"
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={position}
          aria-label="Lensing magnification, mu"
          aria-valuetext={`mu equals ${muLabel}`}
          onChange={(event) => setPosition(Number(event.target.value))}
        />
        <div className="mchart__scale">
          <span>1× · no lens</span>
          <span>10×</span>
          <span>60×</span>
        </div>
      </div>

      <figcaption className="mchart__caption" aria-live="polite">
        At μ = <b>{muLabel}×</b>, <b>{visible.length}</b> of 5 supernovae are
        detectable.{' '}
        <span className="mchart__caption-note">
          Lensing adds 2.5 log₁₀ μ magnitudes to the apparent brightness. The
          explosion itself does not change.
        </span>
      </figcaption>
    </figure>
  )
}
