/*
 * A single-peaked, Poisson-like time-delay distribution for the 92 pairs that
 * passed the first search cut. The final two candidates live in the 20–25 d and
 * 40–45 d bins and are overlaid in gold.
 */
const BINS = [1, 2, 3, 4, 6, 8, 9, 10, 11, 10, 9, 7, 5, 3, 2, 1, 1, 0, 0, 0]

const BIN_DAYS = 5
const MAX_COUNT = 16
const TOTAL = BINS.reduce((sum, count) => sum + count, 0)
const MEDIAN = 41.4

const CANDIDATE_DELAYS = [24.9, 44.9]
const CANDIDATE_BINS = new Set(
  CANDIDATE_DELAYS.map((delay) => Math.floor(delay / BIN_DAYS)),
)

const Y_TICKS = [16, 12, 8, 4, 0]
const GRID_TICKS = [0, 4, 8, 12, 16]

export function TimeDelayHistogram() {
  return (
    <div className="frb-histogram">
      <div className="frb-histogram__header">
        <span>Number of pairs</span>
        <span>{TOTAL} tested pairs · 5-day bins</span>
      </div>

      {/* Labels live above the plot so they can never overlap a bar. */}
      <div className="frb-histogram__candidate-labels" aria-hidden="true">
        {CANDIDATE_DELAYS.map((delay) => (
          <span
            key={delay}
            className="frb-histogram__candidate-label"
            style={{ left: `${delay}%` }}
          >
            {delay} d
          </span>
        ))}
      </div>

      <div className="frb-histogram__body">
        <div className="frb-histogram__y-axis" aria-hidden="true">
          {Y_TICKS.map((value) => (
            <span
              key={value}
              style={{ bottom: `${(value / MAX_COUNT) * 100}%` }}
            >
              {value}
            </span>
          ))}
        </div>

        <div
          className="frb-histogram__plot"
          role="img"
          aria-label="Histogram of time delays for 92 tested FRB pairs, with a single peak near 41 days. The two candidate pairs at 24.9 and 44.9 days are highlighted in gold; the median is 41.4 days."
        >
          {GRID_TICKS.map((value) => (
            <span
              key={value}
              className="frb-histogram__gridline"
              style={{ bottom: `${(value / MAX_COUNT) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="frb-histogram__bars" aria-hidden="true">
            {BINS.map((count, index) => {
              const isCandidate = CANDIDATE_BINS.has(index)
              return (
                <span
                  key={index}
                  className={`frb-histogram__bar${
                    isCandidate ? ' frb-histogram__bar--candidate' : ''
                  }`}
                  style={{ height: `${(count / MAX_COUNT) * 100}%` }}
                  title={`${index * BIN_DAYS}–${index * BIN_DAYS + BIN_DAYS} days: ${count} pairs${
                    isCandidate ? ' · candidate pair' : ''
                  }`}
                />
              )
            })}
          </div>

          {CANDIDATE_DELAYS.map((delay) => (
            <span
              key={delay}
              className="frb-histogram__candidate-line"
              style={{ left: `${delay}%` }}
              aria-hidden="true"
            />
          ))}
          <span
            className="frb-histogram__median-line"
            style={{ left: `${MEDIAN}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="frb-histogram__x-axis" aria-hidden="true">
        {[0, 20, 40, 60, 80, 100].map((value) => (
          <span key={value}>{value}</span>
        ))}
      </div>
      <p className="frb-histogram__x-label">Time delay (days)</p>

      <ul className="frb-histogram__legend" aria-label="Histogram legend">
        <li>
          <i
            className="frb-histogram__key frb-histogram__key--all"
            aria-hidden="true"
          />
          Grey: all tested pairs
        </li>
        <li>
          <i
            className="frb-histogram__key frb-histogram__key--candidate"
            aria-hidden="true"
          />
          Gold: 2 candidate pairs · 24.9 / 44.9 d
        </li>
        <li>
          <i
            className="frb-histogram__key frb-histogram__key--median"
            aria-hidden="true"
          />
          Median · 41.4 d
        </li>
      </ul>
    </div>
  )
}
