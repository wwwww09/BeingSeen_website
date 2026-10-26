const BINS = [
  10, 3, 6, 1, 13, 1, 3, 9, 15, 9, 0, 4, 5, 4, 2, 5, 0, 1, 0, 1,
]

const MAX_COUNT = 16
const TOTAL = BINS.reduce((sum, count) => sum + count, 0)

export function TimeDelayHistogram() {
  return (
    <div className="frb-histogram">
      <div className="frb-histogram__header">
        <span>Number of pairs</span>
        <span>{TOTAL} candidate pairs · 5-day bins</span>
      </div>

      <div className="frb-histogram__body">
        <div className="frb-histogram__y-axis" aria-hidden="true">
          {[16, 12, 8, 4, 0].map((value) => (
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
          aria-label="Histogram of time delays for 92 candidate FRB pairs. Two candidate pairs are marked at 24.9 and 44.9 days; the median is 41.4 days."
        >
          {[0, 4, 8, 12, 16].map((value) => (
            <span
              key={value}
              className="frb-histogram__gridline"
              style={{ bottom: `${(value / MAX_COUNT) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          <div className="frb-histogram__bars" aria-hidden="true">
            {BINS.map((count, index) => (
              <span
                key={index}
                className="frb-histogram__bar"
                style={{ height: `${(count / MAX_COUNT) * 100}%` }}
                title={`${index * 5}–${index * 5 + 5} days: ${count} pairs`}
              />
            ))}
          </div>

          <span
            className="frb-histogram__candidate-line"
            style={{ left: '24.9%' }}
            aria-hidden="true"
          >
            <em>24.9 d</em>
          </span>
          <span
            className="frb-histogram__candidate-line"
            style={{ left: '44.9%' }}
            aria-hidden="true"
          >
            <em>44.9 d</em>
          </span>
          <span
            className="frb-histogram__median-line"
            style={{ left: '41.4%' }}
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
            className="frb-histogram__key frb-histogram__key--candidate"
            aria-hidden="true"
          />
          Candidate pairs · 24.9 / 44.9 d
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
