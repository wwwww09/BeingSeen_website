import type { Metadata } from 'next'
import MassCorrectionScene from '@/components/MassCorrectionScene'
import { getGravitationalWaves } from '@/lib/data'
import GwMassChart from '@/components/charts/GwMassChart'

export const metadata: Metadata = {
  title: 'Can GW Lensing Correct Black Hole Masses?',
  description:
    'Two events in GWTC-5.0 fall into the pair-instability mass gap. If their signals were magnified by gravitational lensing, their true masses would fall back into the normal range.',
}

export default function GravitationalWaveLensingPage() {
  const { gravitationalWaves: gw } = getGravitationalWaves()
  const [a, b] = gw.candidates

  return (
    <main className="page">
      <header>
        <p className="section__label">Sub-question 3 · The only messenger</p>
        <h1 className="title">Can GW Lensing Correct Black Hole Masses?</h1>
        <p className="lede">
          A black hole merger sends out no light. Gravity waves are the only signal we
          receive — and unlike electromagnetic waves, we cannot independently measure how
          far away or how massive the source is. Everything is inferred from the signal
          amplitude. So if a lens magnified that signal, we will overestimate the masses,
          and we will have no way of knowing.
        </p>
      </header>

      {/* ------------------------------------------------ 结论 */}
      <section className="section">
        <div className="callout callout--gold">
          <p className="callout__quote">
            &ldquo;Gravitational wave lensing provides a mass correction: it tells us
            that some &lsquo;anomalous&rsquo; black holes may simply be lensed.&rdquo;
          </p>
          <p className="callout__note">
            This is a hypothesis test, not a measurement. We ask how much magnification
            <em> would be required</em> to move these events out of the pair-instability
            gap — a range where stellar evolution says black holes should not form.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 物理关系 */}
      <section className="section">
        <p className="section__label">The physics</p>
        <h2 className="section-title">Why a lens makes black holes look heavier</h2>
        <div className="grid grid--2" style={{ marginTop: 18 }}>
          <div className="panel">
            <h3 className="sub-title">The relation</h3>
            <p className="body" style={{ margin: 0 }}>
              For a lensed gravitational wave, the observed mass scales with the square
              root of the magnification:
            </p>
            <p
              className="mono"
              style={{
                fontSize: 17,
                color: 'var(--gold)',
                margin: '14px 0',
                textAlign: 'center',
              }}
            >
              m<sub>obs</sub> = m<sub>true</sub> × √μ
            </p>
            <p className="body" style={{ margin: 0 }}>
              Rearranged, the true mass is m<sub>true</sub> = m<sub>obs</sub> / √μ. With
              no lensing, μ = 1 and the masses we report are the masses we get.
            </p>
          </div>
          <div className="panel">
            <h3 className="sub-title">The constraint that matters</h3>
            <p className="body" style={{ margin: 0 }}>
              A single lens applies <strong>one</strong> magnification to every image.
              That means the <em>ratio</em> of the two black hole masses is unchanged:
              lensing brightens the signal, it does not reshape the mass spectrum.
            </p>
            <p className="body" style={{ marginTop: 12 }}>
              So both masses must be divided by the same √μ. Dividing each mass by its
              own separate factor would silently alter the mass ratio — which no lens can
              do.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ 交互关卡 */}
      <section className="section">
        <p className="section__label">Interactive · Correct the masses</p>
        <h2 className="section-title">Turn the magnification up</h2>
        <p className="lede">
          The dashed outlines are the masses we would report with no lensing. The solid
          bars are what the masses become once you allow for magnification. Get every bar
          below the boundary and the events stop being anomalies.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <MassCorrectionScene candidates={gw.candidates} />
        </div>
      </section>

      {/* ------------------------------------------------ 文档要求的图表 */}
      <section className="section">
        <p className="section__label">Observed vs corrected</p>
        <h2 className="section-title">The two candidates in GWTC-5.0</h2>
        <p className="lede">
          Out of {gw.catalogTotal} gravitational-wave events in GWTC-5.0, exactly{' '}
          {gw.candidateCount} have both component masses above {gw.gapLowerBound} M☉ —
          inside the range where pair-instability should prevent black holes from
          forming at all.
        </p>

        <div className="grid grid--2" style={{ marginTop: 18 }}>
          {gw.candidates.map((c) => (
            <div key={c.name} className="panel">
              <div className="paircard__names" style={{ marginBottom: 14 }}>
                <span className="badge badge--gold">in the mass gap</span>
                <span className="mono" style={{ fontSize: 13 }}>
                  {c.name}
                </span>
              </div>
              <table className="table">
                <tbody>
                  <tr>
                    <td>Observed m₁</td>
                    <td style={{ color: 'var(--text)' }}>{c.m1Obs.toFixed(1)} M☉</td>
                    <td className="muted small">
                      [{c.m1ObsRange[0].toFixed(1)}, {c.m1ObsRange[1].toFixed(1)}]
                    </td>
                  </tr>
                  <tr>
                    <td>Corrected m₁</td>
                    <td style={{ color: 'var(--lens-green-bright)', fontWeight: 650 }}>
                      {c.m1Corr.toFixed(1)} M☉
                    </td>
                    <td className="muted small">
                      [{c.m1CorrRange[0].toFixed(1)}, {c.m1CorrRange[1].toFixed(1)}]
                    </td>
                  </tr>
                  <tr>
                    <td>Observed m₂</td>
                    <td style={{ color: 'var(--text)' }}>{c.m2Obs.toFixed(1)} M☉</td>
                    <td className="muted small">
                      [{c.m2ObsRange[0].toFixed(1)}, {c.m2ObsRange[1].toFixed(1)}]
                    </td>
                  </tr>
                  <tr>
                    <td>Corrected m₂</td>
                    <td style={{ color: 'var(--lens-green-bright)', fontWeight: 650 }}>
                      {c.m2Corr.toFixed(1)} M☉
                    </td>
                    <td className="muted small">
                      [{c.m2CorrRange[0].toFixed(1)}, {c.m2CorrRange[1].toFixed(1)}]
                    </td>
                  </tr>
                  <tr>
                    <td>Required magnification</td>
                    <td colSpan={2} style={{ color: 'var(--gold)', fontWeight: 650 }}>
                      μ = {c.mu.toFixed(2)} &nbsp;(√μ = {c.sqrtMu.toFixed(3)})
                    </td>
                  </tr>
                  <tr>
                    <td>Luminosity distance</td>
                    <td colSpan={2}>
                      {c.luminosityDistance.toFixed(0)} Mpc
                      <span className="muted small">
                        {' '}
                        [{c.luminosityDistanceRange[0].toFixed(0)},{' '}
                        {c.luminosityDistanceRange[1].toFixed(0)}]
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Network SNR</td>
                    <td colSpan={2}>{c.snr.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="panel panel--flush" style={{ marginTop: 18 }}>
          <GwMassChart candidates={gw.candidates} gapLowerBound={gw.gapLowerBound} />
        </div>
      </section>

      {/* ------------------------------------------------ 数字总结 */}
      <section className="section">
        <p className="section__label">Where the masses land</p>
        <h2 className="section-title">Required magnification per event</h2>
        <p className="lede">
          To pull the primary mass down to the {gw.gapLowerBound} M☉ boundary,{' '}
          {a.name} needs μ = {a.mu.toFixed(2)} while {b.name} needs μ = {b.mu.toFixed(2)}.
          Both are modest lensing factors — well within what a galaxy-scale lens can
          produce. That is what makes the hypothesis worth taking seriously.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Observed m₁</th>
                <th>Corrected m₁</th>
                <th>Observed m₂</th>
                <th>Corrected m₂</th>
                <th>√μ</th>
                <th>μ</th>
                <th>Out of gap?</th>
              </tr>
            </thead>
            <tbody>
              {gw.candidates.map((c) => (
                <tr key={c.name}>
                  <td style={{ color: 'var(--text)' }}>{c.name}</td>
                  <td>{c.m1Obs.toFixed(1)}</td>
                  <td style={{ color: 'var(--lens-green-bright)' }}>{c.m1Corr.toFixed(1)}</td>
                  <td>{c.m2Obs.toFixed(1)}</td>
                  <td style={{ color: 'var(--lens-green-bright)' }}>{c.m2Corr.toFixed(1)}</td>
                  <td>{c.sqrtMu.toFixed(3)}</td>
                  <td style={{ color: 'var(--gold)' }}>{c.mu.toFixed(2)}</td>
                  <td>
                    {c.m1Corr < gw.gapLowerBound &&
                    c.m2Corr < gw.gapLowerBound ? (
                      <span className="badge badge--green">yes</span>
                    ) : (
                      <span className="badge badge--red">no</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------ 局限 */}
      <section className="section">
        <p className="section__label">What would settle it</p>
        <h2 className="section-title">The hypothesis is not yet a detection</h2>
        <div className="callout">
          <p className="callout__quote">
            Lensed gravitational waves have never been confirmed.
          </p>
          <p className="callout__note">
            Nothing on this page measures a magnification. It computes the magnification
            that <em>would</em> be required. Confirming it would need a signature the
            lens imprints on the waveform itself — beating patterns from the interference
            of two images, or a repeated identical event separated in time. Mass alone
            cannot distinguish &ldquo;unusually heavy black holes&rdquo; from
            &ldquo;ordinary black holes behind a lens&rdquo;.
          </p>
        </div>
        <p className="small muted" style={{ marginTop: 14, maxWidth: '84ch' }}>
          Method note: the two events are selected as those in GWTC-5.0 with both
          source-frame component masses above {gw.gapLowerBound} M☉. The required
          magnification is derived by assuming the true primary mass sits exactly at that
          boundary. Uncertainties on the corrected masses are propagated by scaling the
          catalogue&rsquo;s asymmetric error bounds by the same √μ factor applied to the
          central values.
        </p>
      </section>
    </main>
  )
}
