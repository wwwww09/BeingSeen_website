import { useId, useMemo, useState } from 'react'
import { supernovae, ZTF_LIMIT } from '../data/supernovae'

/**
 * "The Magnification Effect" — five real lensed supernovae on one axis.
 *
 * Each row is a supernova: the dark grey end is the magnitude it would have
 * with no lens, the gold end is the magnitude the lens actually gives it. The
 * dashed red line is the detection limit; drag it and the rows light up or
 * fade. Custom SVG rather than a charting library: five rows need no runtime,
 * and the type has to sit in Baskerville on a transparent field.
 */

const MAG_MIN = 17
const MAG_MAX = 28
const W = 1000
const H = 392
const PAD = { left: 208, right: 46, top: 58 }
const ROW = 54

const ROWS = [...supernovae].sort((a, b) => a.with_lens - b.with_lens)

const PLOT_LEFT = PAD.left
const PLOT_RIGHT = W - PAD.right
const PLOT_BOTTOM = PAD.top + (ROWS.length - 1) * ROW
const AXIS_Y = PLOT_BOTTOM + 34

const TICKS = Array.from({ length: MAG_MAX - MAG_MIN + 1 }, (_, i) => MAG_MIN + i)

/** Larger magnitude = fainter = further right. */
const xOf = (mag: number) =>
  PLOT_LEFT + ((mag - MAG_MIN) / (MAG_MAX - MAG_MIN)) * (PLOT_RIGHT - PLOT_LEFT)

export function MagnitudeChart() {
  const uid = useId().replace(/:/g, '')
  const [limit, setLimit] = useState(ZTF_LIMIT)

  const visible = useMemo(
    () => ROWS.filter((row) => row.with_lens < limit).length,
    [limit],
  )

  // A hairline of tolerance so 20.5 does not flicker to 20.49 on rounding.
  const atZtf = Math.abs(limit - ZTF_LIMIT) < 0.05

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
            Five lensed supernovae, apparent magnitude with and without a lens
          </title>
          <desc id={`${uid}-desc`}>
            Each supernova is drawn from the magnitude it would have without a
            lens (dark grey) to the magnitude the lens gives it (gold). A
            movable dashed line marks the detection limit; supernovae brighter
            than the limit are highlighted.
          </desc>

          <defs>
            <linearGradient id={`${uid}-fade`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffcf8b" stopOpacity="1" />
              <stop offset="1" stopColor="#a8a8a8" stopOpacity="0.9" />
            </linearGradient>
            <filter
              id={`${uid}-glow`}
              x="-250%"
              y="-250%"
              width="500%"
              height="500%"
            >
              <feGaussianBlur stdDeviation="4.5" />
            </filter>
          </defs>

          {/* magnitude grid */}
          {TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={xOf(tick)}
                x2={xOf(tick)}
                y1={PAD.top - 26}
                y2={AXIS_Y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
              <text
                className="mchart__tick"
                x={xOf(tick)}
                y={AXIS_Y + 21}
                textAnchor="middle"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* one row per supernova */}
          {ROWS.map((row, index) => {
            const y = PAD.top + index * ROW
            const xWith = xOf(row.with_lens)
            const xWithout = xOf(row.without_lens)
            const seen = row.with_lens < limit

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

                {/* dark underlay keeps the rule readable over the star cloud */}
                <line
                  x1={xWith}
                  y1={y}
                  x2={xWithout}
                  y2={y}
                  stroke="rgba(0,0,0,0.62)"
                  strokeWidth={4.5}
                  strokeLinecap="round"
                />
                <line
                  x1={xWith}
                  y1={y}
                  x2={xWithout}
                  y2={y}
                  stroke={`url(#${uid}-fade)`}
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
                <circle cx={xWithout} cy={y} r={2.2} fill="#9a9a9a" opacity={0.8} />

                <circle
                  cx={xWith}
                  cy={y}
                  r={seen ? 13 : 9}
                  fill="#ffcf8b"
                  opacity={seen ? 0.24 : 0.07}
                  filter={`url(#${uid}-glow)`}
                />
                <circle
                  cx={xWith}
                  cy={y}
                  r={seen ? 4.6 : 3.2}
                  fill={seen ? '#ffe8c4' : '#b9985f'}
                />

                {seen ? (
                  <text
                    className="mchart__value"
                    x={xWith - 13}
                    y={y - 11}
                    textAnchor="end"
                  >
                    {row.with_lens.toFixed(1)}
                  </text>
                ) : null}
              </g>
            )
          })}

          {/* the limit */}
          <g className="mchart__limit">
            <line
              x1={xOf(limit)}
              x2={xOf(limit)}
              y1={PAD.top - 34}
              y2={AXIS_Y}
              stroke="#ff5c35"
              strokeWidth={1.25}
              strokeDasharray="3 6"
            />
            <text
              className="mchart__limit-label"
              x={xOf(limit) + 11}
              y={PAD.top - 40}
            >
              {atZtf ? 'ZTF limit' : `m ${limit.toFixed(1)}`}
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
            y={AXIS_Y + 44}
            textAnchor="middle"
          >
            Apparent magnitude
          </text>
          <text
            className="mchart__axis-hint"
            x={PLOT_LEFT}
            y={AXIS_Y + 62}
            textAnchor="start"
          >
            ← brighter
          </text>
          <text
            className="mchart__axis-hint"
            x={PLOT_RIGHT}
            y={AXIS_Y + 62}
            textAnchor="end"
          >
            fainter →
          </text>
        </svg>

        <div className="mchart__controls">
        <div className="mchart__slider-head">
          <span>Detection limit</span>
          <span className="mchart__slider-value">m = {limit.toFixed(1)}</span>
        </div>
        <input
          className="mchart__slider"
          type="range"
          min={MAG_MIN}
          max={MAG_MAX}
          step={0.1}
          value={limit}
          aria-label="Detection limit, apparent magnitude"
          aria-valuetext={`m equals ${limit.toFixed(1)}`}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
        <div className="mchart__scale">
          <span>17 · brighter</span>
          <span>fainter · 28</span>
        </div>
        </div>
        </div>
      </div>

      <figcaption className="mchart__caption" aria-live="polite">
        At limit m = {limit.toFixed(1)}, <b>{visible}</b> out of 5 supernovae are
        visible.
      </figcaption>
    </figure>
  )
}
