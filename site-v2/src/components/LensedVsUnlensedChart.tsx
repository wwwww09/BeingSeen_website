import data from '../data/lensed-vs-unlensed.json'

/**
 * The lensed-vs-unlensed distribution for the 64,309 simulated systems.
 *
 * The unlensed curve is the counterfactual: the same systems with the lens
 * removed, m + 2.5 log₁₀ μ. The lens shifts the population about one magnitude
 * left and opens a small detectable tail. The inset zooms that tail so four
 * gold systems against zero grey systems are impossible to miss.
 */

const W = 1000
const H = 400
const PAD = { left: 72, right: 30, top: 46, bottom: 64 }
const BASE = H - PAD.bottom
const X_MIN = 19
const X_MAX = 36
const LIMIT = data.limit
const Y_MAX = 5000
const LOG_MAX = Math.log10(Y_MAX + 1)

const xOf = (mag: number) =>
  PAD.left + ((mag - X_MIN) / (X_MAX - X_MIN)) * (W - PAD.left - PAD.right)
const yOf = (count: number) =>
  BASE - (Math.log10(count + 1) / LOG_MAX) * (BASE - PAD.top)

const TICKS = Array.from({ length: X_MAX - X_MIN + 1 }, (_, i) => X_MIN + i)
const Y_TICKS = [1, 10, 100, 1000, 5000]

const stepLine = (edges: number[], counts: number[]) => {
  let d = `M ${xOf(edges[0])} ${yOf(counts[0])}`
  counts.forEach((count, i) => {
    d += ` L ${xOf(edges[i + 1])} ${yOf(count)}`
    if (i < counts.length - 1) {
      d += ` L ${xOf(edges[i + 1])} ${yOf(counts[i + 1])}`
    }
  })
  return d
}

const stepArea = (edges: number[], counts: number[]) =>
  `${stepLine(edges, counts)} L ${xOf(edges[edges.length - 1])} ${BASE} L ${xOf(edges[0])} ${BASE} Z`

// The zoom panel isolates m = 19...22, where the detections actually happen.
const IX = 80
const IY = 44
const IW = 304
const IH = 152
const I_PAD = 14
const TAIL_MIN = 19
const TAIL_MAX = 22
const TAIL_MAX_COUNT = Math.max(
  ...data.tail.lensed,
  ...data.tail.unlensed,
  1,
)
const ixOf = (mag: number) =>
  IX + I_PAD + ((mag - TAIL_MIN) / (TAIL_MAX - TAIL_MIN)) * (IW - I_PAD * 2)
const iyOf = (count: number) =>
  IY + IH - 24 - (count / TAIL_MAX_COUNT) * (IH - 46)
const I_BAR =
  (IW - I_PAD * 2) / (data.tail.edges.length - 1)

export function LensedVsUnlensedChart() {
  const main = data.main
  const tail = data.tail
  const lensedColor = '#ffcf8b'
  const unlensedColor = 'rgba(190, 190, 190, 0.52)'

  return (
    <figure className="lensed-chart">
      <div className="lensed-chart__scroller">
        <svg
          className="lensed-chart__svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Overlaid histogram of ${data.total.toLocaleString()} simulated lensing systems. Without a lens, ${data.detected.unlensed} clear the ZTF limit; with a lens, ${data.detected.lensed} do.`}
        >
          <defs>
            <linearGradient id="lensed-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255, 207, 139, 0.24)" />
              <stop offset="1" stopColor="rgba(255, 207, 139, 0.03)" />
            </linearGradient>
            <linearGradient id="unlensed-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(190, 190, 190, 0.15)" />
              <stop offset="1" stopColor="rgba(190, 190, 190, 0.02)" />
            </linearGradient>
          </defs>

          {/* the ZTF detection window */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={xOf(LIMIT) - PAD.left}
            height={BASE - PAD.top}
            fill="rgba(255, 207, 139, 0.045)"
          />
          {/* y grid (log counts) */}
          {Y_TICKS.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke="rgba(255,255,255,0.06)"
              />
              <text
                className="lensed-chart__tick"
                x={PAD.left - 10}
                y={yOf(tick) + 4}
                textAnchor="end"
              >
                {tick >= 1000 ? `${tick / 1000}k` : tick}
              </text>
            </g>
          ))}

          {/* x grid */}
          {TICKS.map((tick) => (
            <line
              key={tick}
              x1={xOf(tick)}
              x2={xOf(tick)}
              y1={PAD.top}
              y2={BASE}
              stroke="rgba(255,255,255,0.045)"
            />
          ))}

          {/* distributions */}
          <path
            d={stepArea(main.edges, main.unlensed)}
            fill="url(#unlensed-fill)"
          />
          <path
            d={stepArea(main.edges, main.lensed)}
            fill="url(#lensed-fill)"
          />
          <path
            d={stepLine(main.edges, main.unlensed)}
            fill="none"
            stroke={unlensedColor}
            strokeWidth={1.5}
          />
          <path
            d={stepLine(main.edges, main.lensed)}
            fill="none"
            stroke={lensedColor}
            strokeWidth={1.8}
          />

          {/* detection limit */}
          <line
            x1={xOf(LIMIT)}
            x2={xOf(LIMIT)}
            y1={PAD.top - 18}
            y2={BASE}
            stroke="#ff5c35"
            strokeWidth={1.2}
            strokeDasharray="3 6"
          />
          <text
            className="lensed-chart__limit"
            x={xOf(LIMIT) + 10}
            y={PAD.top - 22}
          >
            ZTF limit · m = {LIMIT}
          </text>

          {/* legend */}
          <g className="lensed-chart__legend">
            <line
              x1={W - PAD.right - 220}
              x2={W - PAD.right - 198}
              y1={22}
              y2={22}
              stroke={unlensedColor}
              strokeWidth={2}
            />
            <text x={W - PAD.right - 190} y={27}>
              unlensed
            </text>
            <line
              x1={W - PAD.right - 90}
              x2={W - PAD.right - 68}
              y1={22}
              y2={22}
              stroke={lensedColor}
              strokeWidth={2}
            />
            <text x={W - PAD.right - 60} y={27}>
              lensed
            </text>
          </g>

          {/* tail zoom: the four detections against zero */}
          <g className="lensed-chart__inset">
            <rect
              x={IX}
              y={IY}
              width={IW}
              height={IH}
              fill="rgba(6, 8, 12, 0.92)"
              stroke="rgba(236, 233, 226, 0.18)"
            />
            <text className="lensed-chart__inset-title" x={IX + 14} y={IY + 22}>
              TAIL ZOOM · m &lt; 22
            </text>
            <text className="lensed-chart__inset-count" x={IX + IW - 14} y={IY + 22} textAnchor="end">
              {data.detected.lensed} lensed · {data.detected.unlensed} unlensed
            </text>

            {tail.edges.slice(0, -1).map((from, index) => {
              const x = ixOf(from) + 0.5
              const unlensedH = IY + IH - 24 - iyOf(tail.unlensed[index])
              const lensedH = IY + IH - 24 - iyOf(tail.lensed[index])
              return (
                <g key={from}>
                  {tail.unlensed[index] > 0 ? (
                    <rect
                      x={x}
                      y={iyOf(tail.unlensed[index])}
                      width={Math.max(1, I_BAR - 1)}
                      height={unlensedH}
                      fill="rgba(190,190,190,0.34)"
                    />
                  ) : null}
                  {tail.lensed[index] > 0 ? (
                    <rect
                      x={x}
                      y={iyOf(tail.lensed[index])}
                      width={Math.max(1, I_BAR - 1)}
                      height={lensedH}
                      fill={lensedColor}
                      opacity={from < LIMIT ? 1 : 0.42}
                    />
                  ) : null}
                </g>
              )
            })}

            <line
              x1={ixOf(LIMIT)}
              x2={ixOf(LIMIT)}
              y1={IY + 32}
              y2={IY + IH - 22}
              stroke="#ff5c35"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <line
              x1={IX + I_PAD}
              x2={IX + IW - I_PAD}
              y1={IY + IH - 22}
              y2={IY + IH - 22}
              stroke="rgba(255,255,255,0.18)"
            />
            <text
              className="lensed-chart__inset-tick"
              x={ixOf(19)}
              y={IY + IH - 8}
              textAnchor="start"
            >
              19
            </text>
            <text
              className="lensed-chart__inset-tick"
              x={ixOf(20.5)}
              y={IY + IH - 8}
              textAnchor="middle"
            >
              20.5
            </text>
            <text
              className="lensed-chart__inset-tick"
              x={ixOf(22)}
              y={IY + IH - 8}
              textAnchor="end"
            >
              22
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
              className="lensed-chart__tick"
              x={xOf(tick)}
              y={BASE + 22}
              textAnchor="middle"
            >
              {tick}
            </text>
          ))}
          <text
            className="lensed-chart__axis"
            x={(PAD.left + W - PAD.right) / 2}
            y={BASE + 44}
            textAnchor="middle"
          >
            Apparent magnitude · first-arriving image
          </text>
          <text
            className="lensed-chart__axis"
            x={20}
            y={PAD.top + (BASE - PAD.top) / 2}
            textAnchor="middle"
            transform={`rotate(-90 20 ${PAD.top + (BASE - PAD.top) / 2})`}
          >
            Systems (log)
          </text>
        </svg>
      </div>

      <p className="lensed-chart__scroll-hint">
        Scroll sideways for the full distribution →
      </p>

      <div className="lensed-chart__summary">
        <div className="lensed-chart__stat">
          <span className="lensed-chart__value lensed-chart__value--muted">
            {data.detected.unlensed}
          </span>
          <span className="lensed-chart__label">detections without a lens</span>
        </div>
        <span className="lensed-chart__arrow" aria-hidden="true">
          →
        </span>
        <div className="lensed-chart__stat">
          <span className="lensed-chart__value">{data.detected.lensed}</span>
          <span className="lensed-chart__label">detections with a lens</span>
        </div>
        <p className="lensed-chart__message">
          Lensing is rare, but it opens a detectable tail that would otherwise
          be empty — at least an order of magnitude in effective supernova
          yield.
        </p>
      </div>
      <p className="lensed-chart__note">
        The same {data.total.toLocaleString()} simulated systems with the lens
        removed: m<sub>unlensed</sub> = m<sub>lensed</sub> + 2.5 log₁₀ μ.
        Detections are first-arriving images brighter than m = {LIMIT}. Median
        brightness shifts from {data.median.unlensed.toFixed(2)} to{' '}
        {data.median.lensed.toFixed(2)}.
      </p>
    </figure>
  )
}
