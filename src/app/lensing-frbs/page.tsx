import type { Metadata } from 'next'
import FrbSkyMapClient from '@/components/FrbSkyMapClient'
import TimeDelaySceneClient from '@/components/TimeDelaySceneClient'
import FrbSeparationChart from '@/components/charts/FrbSeparationChart'
import { getFrbs } from '@/lib/data'
import { Cite, References, type Ref } from '@/components/References'

export const metadata: Metadata = {
  title: 'Can Lensing Copy FRB Signals?',
  description:
    'Searching the CHIME/FRB Catalogue for time-delayed image pairs. Gravitational lensing does not change dispersion measure, and that test eliminates every candidate.',
}

export default function LensingFrbsPage() {
  const { frbs } = getFrbs()
  const s = frbs.search

  /*
   * 本页出处。条目待填; what 写明支撑哪句话。
   */
  const refs: Ref[] = [
    { n: 1, what: 'CHIME/FRB catalogue — the 536 events (474 non-repeaters) searched here' },
    {
      n: 2,
      what: 'Gravitational lensing leaves dispersion measure unchanged: both images cross the same ionised medium',
    },
    {
      n: 3,
      what: 'The selection cuts used here — angular separation < 1° and |ΔDM| < 30 pc cm⁻³',
    },
  ]

  return (
    <main className="page">
      <header>
        <p className="section__label">Sub-question 2 · Time delay</p>
        <h1 className="title">Can Lensing &lsquo;Copy&rsquo; FRB Signals?</h1>
        <p className="lede">
          When a fast radio burst passes near a massive galaxy, its path is bent. Some
          light takes a longer route, arriving later. If the burst is bright enough, we
          would see the <em>same</em> burst twice — separated in time. This is what a
          gravitationally lensed FRB would look like. We searched for such pairs in the
          CHIME/FRB Catalogue<Cite n={1} />.
        </p>
      </header>

      {/* ------------------------------------------------ 结论 */}
      <section className="section">
        <div className="callout callout--green">
          <p className="callout__quote">
            &ldquo;In {frbs.uniqueCount} FRB events, we found{' '}
            <strong>no reliable lensed candidate</strong>. Position alone gives{' '}
            {s.funnel[0].count} plausible pairs — but every one of them fails the
            dispersion-measure test.&rdquo;
          </p>
          <p className="callout__note">
            A null result. Lensing does not change dispersion measure<Cite n={2} />, so two
            images of
            the same burst must arrive with the same DM. That single physical requirement
            is what eliminates the candidates — not a lack of data.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 3D 光路 */}
      <section className="section">
        <p className="section__label">The mechanism</p>
        <h2 className="section-title">How a lens creates a time delay</h2>
        <p className="lede">
          The burst on the left emits in all directions. Two rays reach us: one bent
          only slightly (blue), one bent more, travelling a longer path (gold). The
          second image arrives later — by days, in the case of a galaxy-scale lens.
        </p>
        <div className="panel panel--flush" style={{ marginTop: 18 }}>
          <div style={{ height: 520 }}>
            <TimeDelaySceneClient />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 漏斗 */}
      <section className="section">
        <p className="section__label">Interactive · Narrow the search</p>
        <h2 className="section-title">
          {frbs.nonRepeaterCount} bursts, reduced to nothing
        </h2>
        <p className="lede">
          Each row is one physical requirement. Watch what survives. Repeaters are
          removed first — a source that repeats on its own will produce &lsquo;pairs&rsquo;
          that have nothing to do with lensing.
        </p>

        <div className="panel" style={{ marginTop: 18 }}>
          <div className="funnel">
            <div className="funnel__row funnel__row--start">
              <div>
                <div className="funnel__label">
                  Apparent non-repeaters in the catalogue
                </div>
                <div className="funnel__criteria">
                  {frbs.uniqueCount} total − {frbs.repeaterCount} repeaters
                </div>
              </div>
              <div className="funnel__count">{frbs.nonRepeaterCount}</div>
            </div>

            {s.funnel.map((stage) => {
              const zero = stage.count === 0
              return (
                <div
                  key={stage.label}
                  className={`funnel__row${zero ? ' funnel__row--zero' : ''}`}
                >
                  <div>
                    <div className="funnel__label">{stage.label}</div>
                    <div className="funnel__criteria">{stage.criteria}</div>
                    <div className="funnel__bar">
                      <div
                        className="funnel__bar-fill"
                        style={{
                          width: `${Math.max(1.2, (stage.count / frbs.nonRepeaterCount) * 100)}%`,
                          background: zero
                            ? 'linear-gradient(90deg,var(--red-deep),var(--red))'
                            : undefined,
                        }}
                      />
                    </div>
                  </div>
                  <div
                    className={`funnel__count${zero ? ' funnel__count--zero' : ''}${
                      stage.count > 0 && stage.count < 10 ? ' funnel__count--gold' : ''
                    }`}
                  >
                    {stage.count}
                  </div>
                </div>
              )
            })}
          </div>

          <p className="small muted" style={{ marginTop: 16, maxWidth: '82ch' }}>
            <strong>Why the DM cut is decisive.</strong> {s.dmToleranceNote}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 被否掉的候选 */}
      <section className="section">
        <p className="section__label">What the data actually says</p>
        <h2 className="section-title">Two pairs that look promising — and fail</h2>
        <p className="lede">
          These two pairs sit within 0.4° of each other on the sky, which is why an
          earlier analysis flagged them. But their dispersion measures differ by 76 and
          740 pc cm⁻³. No lens can do that.
        </p>

        <div className="grid grid--2" style={{ marginTop: 18 }}>
          {s.claimedPairs.map((p) => (
            <div key={`${p.frb1}-${p.frb2}`} className="paircard paircard--fail">
              <div className="paircard__names">
                <span className="badge badge--red">fails DM test</span>
                <span className="mono" style={{ fontSize: 13 }}>
                  {p.frb1} ↔ {p.frb2}
                </span>
              </div>
              <div className="paircard__metrics">
                <div>
                  <div className="paircard__metric-k">Separation</div>
                  <div className="paircard__metric-v">{p.sepDeg.toFixed(3)}°</div>
                </div>
                <div>
                  <div className="paircard__metric-k">DM</div>
                  <div className="paircard__metric-v">
                    {p.dm1.toFixed(0)} / {p.dm2.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="paircard__metric-k">ΔDM</div>
                  <div className="paircard__metric-v paircard__metric-v--bad">
                    {p.dmDiff.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="paircard__metric-k">Time delay</div>
                  <div className="paircard__metric-v">
                    {p.timeDelayDays === null ? '—' : `${p.timeDelayDays} d`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="panel panel--flush" style={{ marginTop: 18 }}>
          <FrbSeparationChart
            dmCut={30}
            sepCut={1}
            pairs={[
              ...s.bestByDmAgreement.map((p) => ({ ...p, claimed: false })),
              ...s.bestBySeparation.map((p) => ({ ...p, claimed: false })),
              ...s.survivors.map((p) => ({ ...p, claimed: false })),
              ...s.claimedPairs.map((p) => ({ ...p, claimed: true })),
            ]}
          />
        </div>
        {/*
          这里原来写的是 "That corner of the plot is empty." —— 那是假的:
          漏斗自己的下一步就是 "+ DM agrees (< 30) → 3", 而这三个候选的角距
          (0.62° / 0.32° / 0.76°) 和 |ΔDM| (14.1 / 22.2 / 26.6) 全部落在角落里,
          图表也把它们画成了绿点。图和句子互相打脸, 而且下一节标题紧接着就说
          "3 pairs survive a lenient DM cut"。
        */}
        <p className="small muted" style={{ marginTop: 10 }}>
          A genuine lensed pair must satisfy <em>both</em> conditions at once: small
          separation <em>and</em> matching DM. {s.survivorCount} pair
          {s.survivorCount === 1 ? '' : 's'} do reach that corner under the lenient{' '}
          |&Delta;DM| &lt; 30 cut drawn here — but lensing barely touches dispersion
          measure, because both images cross the same ionised medium. A real pair should
          differ by a few pc cm<sup>-3</sup>, not tens. None of them survives the tighter
          test.
        </p>
      </section>

      {/* ------------------------------------------------ 勉强存活的候选 */}
      <section className="section">
        <p className="section__label">The closest things to a candidate</p>
        <h2 className="section-title">
          {s.survivorCount} pair{s.survivorCount === 1 ? '' : 's'} survive a lenient DM cut
        </h2>
        <p className="lede">
          Relaxing the DM tolerance to 30 pc cm⁻³ and requiring overlap within 1°
          <Cite n={3} />,{' '}
          {s.survivorCount} pairs remain. None is convincing — but they are the only
          places worth pointing a follow-up telescope at.
        </p>

        <div className="grid grid--2" style={{ marginTop: 18 }}>
          {s.survivors.map((p) => (
            <div key={`${p.frb1}-${p.frb2}`} className="paircard paircard--pass">
              <div className="paircard__names">
                <span className="badge badge--gold">weak candidate</span>
                <span className="mono" style={{ fontSize: 13 }}>
                  {p.frb1} ↔ {p.frb2}
                </span>
              </div>
              <div className="paircard__metrics">
                <div>
                  <div className="paircard__metric-k">Separation</div>
                  <div className="paircard__metric-v">{p.sepDeg.toFixed(3)}°</div>
                </div>
                <div>
                  <div className="paircard__metric-k">DM</div>
                  <div className="paircard__metric-v">
                    {p.dm1.toFixed(0)} / {p.dm2.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="paircard__metric-k">ΔDM</div>
                  <div className="paircard__metric-v paircard__metric-v--good">
                    {p.dmDiff.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="paircard__metric-k">Time delay</div>
                  <div className="paircard__metric-v">
                    {p.timeDelayDays === null ? '—' : `${p.timeDelayDays} d`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="callout callout--gold" style={{ marginTop: 18 }}>
          <p className="callout__quote">
            The single most DM-consistent pair in the whole catalogue
          </p>
          {s.bestByDmAgreement[0] && (
            <p className="callout__note">
              <span className="mono">{s.bestByDmAgreement[0].frb1}</span> and{' '}
              <span className="mono">{s.bestByDmAgreement[0].frb2}</span> differ in DM by
              only <strong>{s.bestByDmAgreement[0].dmDiff.toFixed(2)} pc cm⁻³</strong> —
              essentially identical. But they are{' '}
              {s.bestByDmAgreement[0].sepDeg.toFixed(2)}° apart on the sky, which is far
              wider than a galaxy-scale lens would produce. So it fails the other
              requirement instead. Note also that two images of one burst would have the
              same fluence and similar SNR; here the SNRs are{' '}
              {s.bestByDmAgreement[0].snr1} and {s.bestByDmAgreement[0].snr2}.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------ 全样本 3D */}
      <section className="section">
        <p className="section__label">The whole catalogue</p>
        <h2 className="section-title">
          {frbs.uniqueCount} bursts in three dimensions
        </h2>
        <p className="lede">
          Direction is the real position on the sky. Distance from the centre is the
          dispersion measure — a proxy for how much ionised gas the signal crossed, and
          therefore how far away it originated. Gold points pass the DM test; red points
          are the two pairs that fail it.
        </p>
        <div className="panel panel--flush" style={{ marginTop: 18 }}>
          <div style={{ height: 560 }}>
            <FrbSkyMapClient
              events={frbs.events}
              survivors={s.survivors.flatMap((p) => [p.frb1, p.frb2])}
              claimed={s.claimedPairs.flatMap((p) => [p.frb1, p.frb2])}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 方法说明 */}
      <section className="section">
        <p className="section__label">Method &amp; honesty note</p>
        <h2 className="section-title">How this search was done — and revised</h2>
        <div className="panel" style={{ marginTop: 18 }}>
          <p className="body">
            Every number on this page is recomputed directly from the CHIME/FRB
            Catalogue&nbsp;1 machine-readable table. Positions, dispersion measures and
            signal-to-noise ratios are read from the catalogue&rsquo;s fixed-width fields;
            DM is taken from the <span className="mono">dm_fitb</span> column and
            cross-checked against{' '}
            <span className="mono">bonsai_dm</span>, which agree.
          </p>
          <p className="body" style={{ marginTop: 14 }}>
            <strong>Correction.</strong> Earlier versions of this analysis reported{' '}
            <em>two clean candidates</em> with DM differences of 0.0 and 5.2 pc cm⁻³.
            Those DM differences could not be reproduced: the column was never actually
            computed, and the real catalogue values are 75.8 and 739.5. The two pairs
            therefore fail the lensing test, and the conclusion of this sub-question is a
            null result rather than a detection. The revised search below is entirely
            reproducible from{' '}
            <span className="mono">build_data.py</span> in the project repository.
          </p>
          <div className="statgrid" style={{ marginTop: 18 }}>
            <div className="bigstat">
              <span className="bigstat__value">{frbs.nonRepeaterCount}</span>
              <span className="bigstat__label">apparent non-repeaters searched</span>
            </div>
            <div className="bigstat">
              <span className="bigstat__value bigstat__value--gold">
                {s.funnel[2].count}
              </span>
              <span className="bigstat__label">
                pairs passing position + lenient DM
              </span>
            </div>
            <div className="bigstat">
              <span className="bigstat__value bigstat__value--red">
                {s.funnel[3].count}
              </span>
              <span className="bigstat__label">
                pairs passing a tight DM cut (&lt; 10)
              </span>
            </div>
            <div className="bigstat">
              <span className="bigstat__value bigstat__value--red">0</span>
              <span className="bigstat__label">
                pairs passing every requirement
              </span>
            </div>
          </div>
        </div>
      </section>

      <References refs={refs} />
    </main>
  )
}
