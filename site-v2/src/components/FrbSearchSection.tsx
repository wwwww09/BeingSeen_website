import { TimeDelayHistogram } from './TimeDelayHistogram'

const CANDIDATES = [
  {
    index: 'Pair 01',
    title: 'A Perfect Match',
    frb1: 'FRB20181129A',
    frb2: 'FRB20181224A',
    delay: '24.9 days',
    dmDiff: '0.0',
  },
  {
    index: 'Pair 02',
    title: 'A Slight Discrepancy Between....',
    frb1: 'FRB20190425B',
    frb2: 'FRB20190609B',
    delay: '44.9 days',
    dmDiff: '5.2',
  },
]

export function FrbSearchSection() {
  return (
    <section className="frb-search">
      <p className="section-kicker">The search</p>
      <h2 className="frb-section-title">The Search for Cosmic Echoes</h2>
      <p className="frb-search-lede">
        We tested every possible pair of the 690 FRBs. The vast majority are
        just random noise with mismatched dispersion measures (DM).
      </p>

      <TimeDelayHistogram />

      <div className="frb-cards">
        {CANDIDATES.map((candidate) => (
          <article className="frb-card" key={candidate.index}>
            <p className="frb-card__index">{candidate.index}</p>
            <h3>{candidate.title}</h3>
            <p className="frb-card__names">
              {candidate.frb1}
              <span aria-hidden="true"> & </span>
              {candidate.frb2}
            </p>

            <dl className="frb-card__stats">
              <div>
                <dt>Time Delay</dt>
                <dd>{candidate.delay}</dd>
              </div>
              <div>
                <dt>DM Diff</dt>
                <dd>{candidate.dmDiff}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <blockquote className="frb-conclusion">
        These 2 candidates provide a new clue for finding lensed FRBs, though
        they require further verification.
      </blockquote>
      <p className="frb-candidate-rate">
        Candidate rate <b>2 / 690 = 0.29%</b>
      </p>
    </section>
  )
}
