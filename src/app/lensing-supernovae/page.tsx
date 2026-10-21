import type { Metadata } from 'next'
import SupernovaExplorer from '@/components/SupernovaExplorer'
import LensCatalogExplorer from '@/components/LensCatalogExplorer'
import ScatterChart from '@/components/charts/ScatterChart'
import { Cite, References, type Ref } from '@/components/References'
import GisneChart from '@/components/charts/GisneChart'
import { getLenses, getSupernovae } from '@/lib/data'

export const metadata: Metadata = {
  title: 'Can Lensing Make Distant Supernovae Visible?',
  description:
    'Without gravitational lensing, none of the five known lensed supernovae in this sample could be detected by ZTF. With lensing, two became visible.',
}

/** 3D 天球上最多画多少个透镜系统 (再多也看不出来, 但会拖慢 HTML) */
const LENS_RENDER_LIMIT = 2500

/** 这五颗超新星的文献占本页的 [4]–[8] */
const SNE_REFS_START = 4

export default function LensingSupernovaePage() {
  const { supernovae, mockSupernovae } = getSupernovae()
  const { lenses } = getLenses()

  // 星表样本本身是随机顺序, 所以直接截取不会让天区分布产生偏移
  const lensSample = lenses.sample.slice(0, LENS_RENDER_LIMIT)

  /*
   * 本页的出处列表。条目的 what 写的是"这条支撑什么", 方便一条条对上;
   * 真正的中文/英文文献条目还没定, 留空 —— 页面上会显示 "entry to be added",
   * 不会假装完整。五颗超新星的 arXiv 号来自数据本身, 不是手打的。
   */
  const refs: Ref[] = [
    {
      n: 1,
      what: 'ZTF limiting magnitude used as the detection threshold (m = 20.5)',
    },
    {
      n: 2,
      what: 'Cosmological parameters: flat ΛCDM, H₀ = 70 km s⁻¹ Mpc⁻¹, Ωm = 0.3',
    },
    { n: 3, what: 'Peak absolute magnitude assumed for a Type Ia supernova (−19.25)' },
    ...supernovae.events.map((e, i) => ({
      n: SNE_REFS_START + i,
      what: `${e.name}: redshift, magnification and time delay`,
      entry: `arXiv:${e.reference}`,
    })),
    {
      n: 9,
      what: 'Simulated lensed-supernova catalogue (N = 64,309) — provenance unknown; the file carries no metadata',
    },
  ]

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
          A supernova is a star exploding. Faraway explosions are far too faint to see.
          Gravity can act as a lens and make one visible. This page asks how much that
          really helps.
        </p>
      </header>

      {/* ------------------------------------------------ 入门铺垫 */}
      <section className="section section--primer">
        <p className="section__label">Before you start</p>
        <h2 className="section-title">What you need to know</h2>
        <ul className="primer">
          <li>
            A supernova is the explosion that ends a massive star&rsquo;s life. For a few
            weeks it can outshine a whole galaxy.
          </li>
          <li>
            Distance dims everything. Ten times further away looks a hundred times
            fainter.
          </li>
          <li>
            Gravity bends light. A heavy galaxy sitting in front of the explosion works
            like a lens.
          </li>
          <li>
            The lens makes the explosion look brighter. It can also split it into several
            images.
          </li>
          <li>
            So the question is simple: does that extra brightness let us see explosions we
            would otherwise miss?
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------ 术语表 */}
      <section className="section section--glossary">
        <p className="section__label">Four words</p>
        <h2 className="section-title">The only vocabulary you need</h2>
        <dl className="glossary">
          <div className="glossary__item">
            <dt>Redshift</dt>
            <dd>
              How much the universe has stretched the light before it reaches us. A bigger
              redshift means further away.
            </dd>
            <dd className="glossary__like">
              Like the pitch of an ambulance dropping as it passes you.
            </dd>
          </div>
          <div className="glossary__item">
            <dt>Apparent magnitude</dt>
            <dd>
              How bright something looks from Earth. <strong>Smaller numbers mean
              brighter.</strong> The Sun is about −27; the faintest star you can see is
              about +6.
            </dd>
            <dd className="glossary__like">Think of a score where lower is better.</dd>
          </div>
          <div className="glossary__item">
            <dt>Detection limit</dt>
            <dd>
              The faintest magnitude a given telescope can still catch. Anything fainter is
              invisible to it.
            </dd>
            <dd className="glossary__like">
              Like the dimmest light your eyes can still make out.
            </dd>
          </div>
          <div className="glossary__item">
            <dt>Magnification (μ)</dt>
            <dd>
              How much brighter the lens makes the image. μ = 10 means ten times as much
              light.
            </dd>
            <dd className="glossary__like">
              Like a magnifying glass focusing sunlight onto one spot.
            </dd>
          </div>
        </dl>
      </section>

      {/* ------------------------------------------------ 结论 */}
      <section className="section">
        <div className="callout callout--gold">
          {/*
            原来写的是 "boosts detection rates by at least an order of magnitude"。
            那句话算术上不成立: 无透镜时可见数是 0, 2/0 没有定义, 任何"倍数"或
            "数量级"都无从计算; 而且 5 个样本给不出"率", 模拟星表本身也全是
            已被透镜的系统, 没有对照组。改成只陈述能数出来的东西。
          */}
          <p className="callout__quote">
            &ldquo;Two of these five supernovae were seen only because of
            lensing.&rdquo;
          </p>
          <p className="callout__note">
            Without gravitational lensing,{' '}
            <strong>
              {supernovae.detectedNoLens} of {supernovae.sampleSize}
            </strong>{' '}
            known lensed supernovae in this sample could be detected by ZTF
            <Cite n={1} />. With
            lensing, <strong>{supernovae.detectedLensed} became visible</strong>. The
            comparison below uses {mockSupernovae.totalRows.toLocaleString()} simulated
            lensing systems.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 互动关卡 */}
      <section className="section">
        <p className="section__label">Interactive · Be the telescope</p>
        <h2 className="section-title">Find out for yourself</h2>
        <p className="lede">
          You are running a survey telescope. Move the slider to set how faint a supernova
          you can still detect. Red dots are the same explosions without lensing. Green
          dots are with it.
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
          Computers can simulate lensing for a huge number of explosions. The left panel
          shows {mockSupernovae.totalRows.toLocaleString()} of them. Almost all sit far
          below what any telescope can reach. The right panel shows the five real ones.
        </p>

        <div className="panel panel--flush" style={{ marginTop: 18 }}>
          <GisneChart
            counts={mockSupernovae.magnitudeDistribution.counts}
            edges={mockSupernovae.magnitudeDistribution.edges}
            limitMag={mockSupernovae.limitingMag}
            events={supernovae.events}
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
          <strong>Note on provenance:</strong> {mockSupernovae.provenance}
          <Cite n={9} /> Individual image
          magnitudes are not necessarily brighter than a total magnitude, so the detection
          count above uses the first-arriving image and is conservative.
        </p>
      </section>

      {/* ------------------------------------------------ 散点 */}
      <section className="section">
        <p className="section__label">Brightness against distance</p>
        <h2 className="section-title">Distance, not lensing, decides what we can see</h2>
        <p className="lede">
          Each point is one simulated system. Fainter systems sit higher up. Moving further
          away makes a system fainter far more than lensing makes it brighter. That is why
          most of them stay unseen.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="chart-scroll">
            <ScatterChart
              points={scatterPoints}
              limitMag={mockSupernovae.limitingMag}
              xLabel="Source redshift  z"
              yLabel="Apparent magnitude (fainter ↑)"
              xDomain={[0, 3.6]}
              yDomain={[32, 19]}
              height={360}
            />
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            A random sample of {scatterPoints.length.toLocaleString()} out of{' '}
            {mockSupernovae.totalRows.toLocaleString()} systems. Gold points are bright
            enough to be detected.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 放大率分布 */}
      <section className="section">
        <p className="section__label">How much brighter?</p>
        <h2 className="section-title">Most lenses give only a small boost</h2>
        <p className="lede">
          Half of the simulated systems are magnified by less than{' '}
          <strong>{mockSupernovae.stats.muTotalMedian.toFixed(2)}×</strong>. That is about{' '}
          {(2.5 * Math.log10(mockSupernovae.stats.muTotalMedian)).toFixed(1)} magnitudes of
          extra brightness. The five real ones sit far to the right, between 8× and 52×.
          They are the extreme cases, which is exactly why we could see them.
        </p>
        <div className="panel" style={{ marginTop: 18 }}>
          <div className="chart-scroll">
            <MagnificationHistogram
              counts={mockSupernovae.magnificationDistribution.counts}
              edges={mockSupernovae.magnificationDistribution.edges}
            />
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            Total magnification μ for the simulated systems. Bins are logarithmic, so
            each step to the right is a doubling or more. The real five sit in the far
            right tail.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------ 样本表 */}
      <section className="section">
        <p className="section__label">The real sample</p>
        <h2 className="section-title">Five lensed supernovae in this sample</h2>
        <p className="lede">
          Each row is one explosion. &ldquo;m (no lens)&rdquo; is how bright it would look
          without a lens. &ldquo;m (lensed)&rdquo; is how bright it actually looks. The
          last column asks whether a telescope like ZTF could have caught it.
        </p>
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
        <p className="small muted" style={{ marginTop: 12, maxWidth: '84ch' }}>
          <strong>Where this list comes from.</strong> These five were compiled by hand from
          the published literature — one row per paper — rather than queried from a
          catalogue:{' '}
          {supernovae.events.map((e, i) => (
            <span key={e.name}>
              {i > 0 ? (i === supernovae.events.length - 1 ? ' and ' : ', ') : ''}
              {e.name} <Cite n={SNE_REFS_START + i} />
            </span>
          ))}
          . That matters for how the numbers above should be read: a hand-compiled list is
          not a complete catalogue, and a paper we missed would change the denominator —
          which is one reason the claim on this page is about these five objects rather
          than about lensed supernovae in general.
        </p>
        <p className="small muted" style={{ marginTop: 10 }}>
          Apparent magnitudes are computed from a flat ΛCDM cosmology
          (H₀ = 70 km s⁻¹ Mpc⁻¹, Ω<sub>m</sub> = 0.3)<Cite n={2} /> with a standard SN Ia
          peak absolute magnitude of −19.25<Cite n={3} />, using
          m = M + μ<sub>dist</sub> − 2.5 log₁₀ μ.
        </p>
      </section>

      {/* ------------------------------------------------ 3D 空间分布 */}
      <section className="section">
        <p className="section__label">In three dimensions</p>
        <h2 className="section-title">
          {lenses.total.toLocaleString()} lenses, {supernovae.events.length} that were
          actually seen
        </h2>
        <p className="lede">
          Each blue point is a galaxy or cluster heavy enough to bend light. Someone has
          already catalogued all of them. The five gold stars are the only lensed
          supernovae we have ever caught in the act. Drag to rotate, scroll to zoom, and
          click a gold star for details.
        </p>

        <LensCatalogExplorer
          lenses={lensSample}
          events={supernovae.events}
          lensTotal={lenses.total}
          withRedshift={lenses.withRedshift}
        />

        <p className="small muted" style={{ marginTop: 12, maxWidth: '84ch' }}>
          <strong>Why the sky looks so sparse.</strong> This is a catalogue of{' '}
          <em>lenses</em>, not of lensed supernovae. A lens only helps if three things
          line up at once. Something bright must sit right behind it. The alignment must
          be close enough to bend the light into several images. And a survey must be
          looking at that patch of sky the moment the explosion peaks. That is the
          coincidence behind the number above: five events out of{' '}
          {lenses.total.toLocaleString()} lenses.
        </p>
      </section>

      <References refs={refs} />
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
            fill="var(--accent)"
            opacity={0.85}
          />
        )
      })}

      {/* 中位数参考线 */}
      <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--border-bright)" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--border-bright)" />

      {[0, 0.5, 1, 1.5, 2, 2.4].map((lg) => {
        const x = PAD.left + (lg / 2.4) * innerW
        return (
          <g key={lg}>
            <text x={x} y={PAD.top + innerH + 17} textAnchor="middle" fill="var(--text-faint)" fontSize={11}>
              {Math.pow(10, lg).toFixed(lg === 0 ? 0 : 1)}×
            </text>
          </g>
        )
      })}
      <text x={PAD.left + innerW / 2} y={H - 6} textAnchor="middle" fill="var(--text-dim)" fontSize={12}>
        Total magnification μ
      </text>
      <text
        x={16}
        y={PAD.top + innerH / 2}
        textAnchor="middle"
        fill="var(--text-dim)"
        fontSize={12}
        transform={`rotate(-90 16 ${PAD.top + innerH / 2})`}
      >
        Systems (log)
      </text>
    </svg>
  )
}
