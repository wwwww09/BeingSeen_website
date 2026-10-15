import type { Metadata } from 'next'
import Image from 'next/image'
import SupernovaExplorer from '@/components/SupernovaExplorer'
import ScatterChart from '@/components/charts/ScatterChart'
import { getSupernovae } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Can Lensing Make Distant Supernovae Visible?',
  description:
    'Without gravitational lensing, none of the five known lensed supernovae in this sample could be detected by ZTF. With lensing, two became visible.',
}

export default function LensingSupernovaePage() {
  const { supernovae, mockSupernovae } = getSupernovae()

  const scatterPoints = mockSupernovae.scatterSample.map((p) => ({
    x: p.sourceRedshift,
    y: p.mag,
    detected: p.detected,
  }))

  return (
    <main className="page">
      <header>
        <p className="section__label">Sub-question 1 · Magnification</p>
        <h1 className="title">Can Lensing Make Distant Supernovae Visible?</h1>
        <p className="lede">
          A supernova at high redshift is too faint for any telescope to see. But if a
          massive galaxy happens to sit between us and the explosion, its gravity bends
          the light into our line of sight and makes the supernova brighter — sometimes
          dramatically so. This is the universe&rsquo;s own telescope.
        </p>
      </header>

      {/* ------------------------------------------------ 结论 */}
      <section className="section">
        <div className="callout callout--gold">
          <p className="callout__quote">
            &ldquo;Gravitational lensing boosts supernova detection rates by at least an
            order of magnitude.&rdquo;
          </p>
          <p className="callout__note">
            Based on the five known gravitationally lensed supernovae (gISNe) in this
            sample, compared against a simulated catalogue of{' '}
            {mockSupernovae.totalRows.toLocaleString()} lensed systems.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 互动关卡 */}
      <section className="section">
        <p className="section__label">Interactive · Be the telescope</p>
        <h2 className="section-title">Find out for yourself</h2>
        <p className="lede">
          You are operating a survey telescope. Set your detection limit and watch which
          supernovae cross into view. The red dots are the same explosions if gravity did
          not bend their light; the green dots are what lensing does to them.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <SupernovaExplorer data={supernovae} />
        </div>
      </section>

      {/* ------------------------------------------------ 文档要求的图表 */}
      <section className="section">
        <p className="section__label">Theoretical vs real</p>
        <h2 className="section-title">
          {mockSupernovae.totalRows.toLocaleString()} simulated systems, and almost none
          are reachable
        </h2>
        <p className="lede">
          The left panel shows the simulated population: the vast majority sit far below
          any realistic detection limit. The right panel shows the real sample — and how
          far lensing moves each one.
        </p>

        <div className="panel panel--flush" style={{ marginTop: 18 }}>
          <Image
            src="/charts/gisne_theoretical_with_real.png"
            alt="Left: histogram of simulated lensed supernova apparent magnitudes with a detection limit marked, showing only 4 of 64309 systems detectable. Right: dumbbell chart of the five real lensed supernovae showing their magnitude with and without lensing."
            width={2480}
            height={960}
            style={{ width: '100%', height: 'auto', display: 'block' }}
            priority
          />
        </div>

        <div className="grid grid--3" style={{ marginTop: 18 }}>
          <div className="panel">
            <div className="bigstat">
              <span className="bigstat__value">{mockSupernovae.totalRows.toLocaleString()}</span>
              <span className="bigstat__label">simulated lensed supernovae</span>
            </div>
          </div>
          <div className="panel">
            <div className="bigstat">
              <span className="bigstat__value bigstat__value--gold">
                {mockSupernovae.brightestImageMag.toFixed(2)}
              </span>
              <span className="bigstat__label">
                brightest single image in the whole catalogue
              </span>
            </div>
          </div>
          <div className="panel">
            <div className="bigstat">
              <span className="bigstat__value bigstat__value--red">
                {mockSupernovae.detectedByZTF}
              </span>
              <span className="bigstat__label">
                above m = {mockSupernovae.limitingMag} (the detection limit)
              </span>
            </div>
          </div>
        </div>

        <p className="small muted" style={{ marginTop: 14, maxWidth: '80ch' }}>
          <strong>Note on provenance:</strong> {mockSupernovae.provenance} Individual image
          magnitudes are not necessarily brighter than a total magnitude, so the detection
          count above uses the first-arriving image and is conservative.
        </p>
      </section>

      {/* ------------------------------------------------ 散点 */}
      <section className="section">
        <p className="section__label">Where the light gets lost</p>
        <h2 className="section-title">Apparent magnitude against redshift</h2>
        <p className="lede">
          Each point is one simulated system. Fainter magnitudes are higher up. Redshift
          pushes systems down the brightness scale, which is why distance — not lensing
          quality — is the dominant reason these explosions stay unseen.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <ScatterChart
            points={scatterPoints}
            limitMag={mockSupernovae.limitingMag}
            xLabel="Source redshift  z"
            yLabel="Apparent magnitude (fainter ↑)"
            xDomain={[0, 3.6]}
            yDomain={[32, 19]}
            height={360}
          />
          <p className="small muted" style={{ marginTop: 8 }}>
            Showing a random sample of {scatterPoints.length.toLocaleString()} of{' '}
            {mockSupernovae.totalRows.toLocaleString()} systems. Gold points are above the
            detection limit.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 放大率分布 */}
      <section className="section">
        <p className="section__label">How much magnification is there?</p>
        <h2 className="section-title">The magnification distribution</h2>
        <p className="lede">
          Most lensing events give only a modest boost. The median total magnification in
          the simulated catalogue is{' '}
          <strong>{mockSupernovae.stats.muTotalMedian.toFixed(2)}×</strong> — roughly{' '}
          {(2.5 * Math.log10(mockSupernovae.stats.muTotalMedian)).toFixed(1)} magnitudes.
          The real gISNe sample is biased towards the spectacular end, where magnifications
          reach 8× to 52×.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <MagnificationHistogram
            counts={mockSupernovae.magnificationDistribution.counts}
            edges={mockSupernovae.magnificationDistribution.edges}
          />
          <p className="small muted" style={{ marginTop: 8 }}>
            Total magnification μ of simulated systems (logarithmic bins). Real
            strongly-lensed supernovae sit well into the right-hand tail.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 样本表 */}
      <section className="section">
        <p className="section__label">The real sample</p>
        <h2 className="section-title">Five known lensed supernovae</h2>
        <div className="panel" style={{ marginTop: 18, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Redshift</th>
                <th>Magnification μ</th>
                <th>Time delay</th>
                <th>m (no lens)</th>
                <th>m (lensed)</th>
                <th>Detectable</th>
              </tr>
            </thead>
            <tbody>
              {[...supernovae.events]
                .sort((a, b) => a.magNoLens - b.magNoLens)
                .map((e) => (
                  <tr key={e.name}>
                    <td style={{ color: 'var(--text)' }}>{e.name}</td>
                    <td>{e.redshift.toFixed(3)}</td>
                    <td>{e.magnification.toFixed(1)}×</td>
                    <td>
                      {e.timeDelayDays === null ? '—' : `${e.timeDelayDays} d`}
                    </td>
                    <td>{e.magNoLens.toFixed(2)}</td>
                    <td>{e.magLensed.toFixed(2)}</td>
                    <td>
                      {e.detectedLensed ? (
                        <span className="badge badge--green">yes</span>
                      ) : (
                        <span className="badge">no</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>
          Apparent magnitudes are computed from a flat ΛCDM cosmology
          (H₀ = 70 km s⁻¹ Mpc⁻¹, Ω<sub>m</sub> = 0.3) with a standard SN Ia peak absolute
          magnitude of −19.25, using m = M + μ<sub>dist</sub> − 2.5 log₁₀ μ.
        </p>
      </section>
    </main>
  )
}

/** 放大率直方图 (对数分箱) */
function MagnificationHistogram({
  counts,
  edges,
}: {
  counts: number[]
  edges: number[]
}) {
  const W = 720
  const H = 240
  const PAD = { top: 16, right: 16, bottom: 42, left: 56 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const maxLog = Math.log10(Math.max(...counts, 1))

  const bw = innerW / counts.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img"
      aria-label="Distribution of total magnification">
      {counts.map((c, i) => {
        const h = c > 0 ? (Math.log10(c) / maxLog) * innerH : 0
        return (
          <rect
            key={i}
            x={PAD.left + i * bw + 0.5}
            y={PAD.top + innerH - h}
            width={Math.max(1, bw - 1)}
            height={h}
            fill="#4da3ff"
            opacity={0.85}
          />
        )
      })}

      {/* 中位数参考线 */}
      <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#2d3f63" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="#2d3f63" />

      {[0, 0.5, 1, 1.5, 2, 2.4].map((lg) => {
        const x = PAD.left + (lg / 2.4) * innerW
        return (
          <g key={lg}>
            <text x={x} y={PAD.top + innerH + 17} textAnchor="middle" fill="#6a7b98" fontSize={11}>
              {Math.pow(10, lg).toFixed(lg === 0 ? 0 : 1)}×
            </text>
          </g>
        )
      })}
      <text x={PAD.left + innerW / 2} y={H - 6} textAnchor="middle" fill="#9aabc7" fontSize={12}>
        Total magnification μ
      </text>
      <text
        x={16}
        y={PAD.top + innerH / 2}
        textAnchor="middle"
        fill="#9aabc7"
        fontSize={12}
        transform={`rotate(-90 16 ${PAD.top + innerH / 2})`}
      >
        Systems (log)
      </text>
    </svg>
  )
}
