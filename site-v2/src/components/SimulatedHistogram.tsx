import { useId } from 'react'
import data from '../data/simulated-magnitudes.json'

/**
 * The 64,309 simulated lensing systems, binned by the apparent magnitude of the
 * first-arriving image (i band). Bars use log counts, otherwise the four
 * systems that clear the limit would be invisible next to the peak at m≈29.5 —
 * and they are the entire point of the plot.
 *
 * Only 4 systems sit left of the ZTF limit, which is exactly what the chapter
 * claims: extreme magnification is rare.
 */

const COUNTS = data.counts as number[]
const EDGES = data.edges as number[]
const LIMIT: number = data.limit
const TOTAL: number = data.total
const DETECTED: number = data.detected

const W = 1000
const H = 300
const PAD = { left: 8, right: 8, top: 40, bottom: 58 }

const X_MIN = EDGES[0]
const X_MAX = EDGES[EDGES.length - 1]
const LOG_MAX = Math.log1p(Math.max(...COUNTS))
const BASE = H - PAD.bottom

const xOf = (mag: number) =>
  PAD.left + ((mag - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.left - PAD.right)
const yOf = (count: number) =>
  BASE - (Math.log1p(count) / LOG_MAX) * (BASE - PAD.top)

const TICKS = Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => X_MIN + i)

export function SimulatedHistogram() {
  const uid = useId().replace(/:/g, '')
  const barWidth = (W - PAD.left - PAD.right) / COUNTS.length

  return (
    <figure className="shist">
      <div className="shist__scroller">
        <svg
          className="shist__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Histogram of ${TOTAL.toLocaleString()} simulated lensed supernovae by the apparent magnitude of the first image. Only four systems are brighter than the ZTF limit of ${LIMIT}.`}
        >
          <defs>
            <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.30)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.05)" />
            </linearGradient>
            <linearGradient id={`${uid}-detected`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255,207,139,0.95)" />
              <stop offset="1" stopColor="rgba(255,207,139,0.45)" />
            </linearGradient>
          </defs>

          {COUNTS.map((count, i) => {
            const from = EDGES[i]
            const to = EDGES[i + 1]
            const detected = to <= LIMIT
            const x = xOf(from)
            const y = yOf(count)
            return (
              <rect
                key={from}
                x={x + 0.6}
                y={y}
                width={Math.max(1, barWidth - 1.2)}
                height={Math.max(0, BASE - y)}
                fill={detected ? `url(#${uid}-detected)` : `url(#${uid}-bar)`}
              />
            )
          })}

          {/* the limit */}
          <g>
            <line
              x1={xOf(LIMIT)}
              x2={xOf(LIMIT)}
              y1={PAD.top - 14}
              y2={BASE}
              stroke="#ff5c35"
              strokeWidth={1.2}
              strokeDasharray="3 6"
            />
            <text
              className="shist__limit"
              x={xOf(LIMIT) + 10}
              y={PAD.top - 18}
            >
              ZTF limit
            </text>
          </g>

          {/* axis */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={BASE}
            y2={BASE}
            stroke="rgba(255,255,255,0.16)"
          />
          {TICKS.map((tick) => (
            <text
              key={tick}
              className="shist__tick"
              x={xOf(tick)}
              y={BASE + 20}
              textAnchor="middle"
            >
              {tick}
            </text>
          ))}
          <text
            className="shist__axis"
            x={(PAD.left + W - PAD.right) / 2}
            y={BASE + 44}
            textAnchor="middle"
          >
            Apparent magnitude
          </text>
          <text className="shist__note shist__note--gold" x={PAD.left} y={BASE + 44}>
            {DETECTED} systems above the limit
          </text>
          <text
            className="shist__note"
            x={W - PAD.right}
            y={PAD.top - 18}
            textAnchor="end"
          >
            {TOTAL.toLocaleString()} systems · log count
          </text>
        </svg>
      </div>
    </figure>
  )
}
