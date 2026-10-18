import { linear, linearTicks, log10, logTicks, compact, nice } from './chartUtils'

/**
 * 模拟透镜超新星的星等分布 (左) + 五颗真实 gISNe 的透镜前后对比 (右)。
 *
 * 原来是 public/charts/gisne_theoretical_with_real.png —— 一张 matplotlib 截图,
 * 有自己的字体、自己的蓝绿红、自己的标题, 贴在深色页面上像从别的网站剪下来的。
 * 现在改成 SVG: 颜色全部走 CSS 变量, 字体跟着站点走, 高清屏不糊,
 * 手机上会自动缩到容器宽度而不用横向滚动。
 */

export interface GisneProps {
  counts: number[]
  edges: number[]
  limitMag: number
  events: {
    name: string
    magNoLens: number
    magLensed: number
    detectedLensed: boolean
  }[]
}

const PAD = { top: 26, right: 22, bottom: 46, left: 58 }

export default function GisneChart({ counts, edges, limitMag, events }: GisneProps) {
  return (
    <div className="gischart">
      <HistogramPanel counts={counts} edges={edges} limitMag={limitMag} />
      <DumbbellPanel events={events} limitMag={limitMag} />
    </div>
  )
}

/* ---------------------------------------------------------------- 左: 直方图 */
function HistogramPanel({ counts, edges, limitMag }: Omit<GisneProps, 'events'>) {
  const W = 640
  const H = 380
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const x0 = edges[0]
  const x1 = edges[edges.length - 1]
  const maxCount = Math.max(...counts, 1)
  const yMax = Math.pow(10, Math.ceil(Math.log10(maxCount)))

  const sx = linear(x0, x1, PAD.left, PAD.left + innerW)
  const sy = log10(1, yMax, PAD.top + innerH, PAD.top)

  const bw = innerW / counts.length
  const limitX = sx(limitMag)

  return (
    <figure className="chartpanel">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Histogram of simulated lensed supernova magnitudes. Only a handful sit brighter than the detection limit of ${limitMag}.`}>
        {/* 可探测区间底色 —— 用金的极低透明度提示"这一侧才算被看见" */}
        <rect
          x={PAD.left}
          y={PAD.top}
          width={Math.max(0, limitX - PAD.left)}
          height={innerH}
          fill="var(--gold)"
          opacity={0.06}
        />

        {logTicks(1, yMax).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
            <text x={PAD.left - 10} y={sy(t) + 4} textAnchor="end" fill="var(--text-faint)" fontSize={11}>
              {compact(t)}
            </text>
          </g>
        ))}

        {counts.map((c, i) => {
          if (c === 0) return null
          const h = Math.max(1, PAD.top + innerH - sy(c))
          const mag = (edges[i] + edges[i + 1]) / 2
          const detectable = mag < limitMag
          return (
            <rect
              key={i}
              x={PAD.left + i * bw + 0.5}
              y={sy(c)}
              width={Math.max(1, bw - 1)}
              height={h}
              fill={detectable ? 'var(--lens-green-bright)' : 'var(--accent-deep)'}
            />
          )
        })}

        {/* 探测极限 */}
        <line
          x1={limitX}
          x2={limitX}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="var(--gold)"
          strokeWidth={1.6}
          strokeDasharray="6 4"
        />
        <text x={limitX + 7} y={PAD.top + 13} fill="var(--gold)" fontSize={11} fontWeight={600}>
          m = {limitMag}
        </text>

        <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--border-bright)" />
        {linearTicks(x0, x1, 6).map((t) => (
          <text key={t} x={sx(t)} y={PAD.top + innerH + 17} textAnchor="middle" fill="var(--text-faint)" fontSize={11}>
            {nice(t, 0)}
          </text>
        ))}

        <text x={PAD.left + innerW / 2} y={H - 8} textAnchor="middle" fill="var(--text-dim)" fontSize={12}>
          Apparent magnitude of the first-arriving image (i band)
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

      <figcaption className="chartpanel__cap">
        <span className="chartpanel__key"><i style={{ background: 'var(--accent-deep)' }} /> below the detection limit</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--lens-green-bright)' }} /> above it</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--gold)' }} /> detection limit</span>
      </figcaption>
    </figure>
  )
}

/* ---------------------------------------------------------------- 右: 哑铃图 */
function DumbbellPanel({ events, limitMag }: Pick<GisneProps, 'events' | 'limitMag'>) {
  /* 和下面的表格同序: 按"没有透镜时的星等"从亮到暗 */
  const sorted = [...events].sort((a, b) => a.magNoLens - b.magNoLens)
  const W = 640
  const H = 380
  const innerW = W - PAD.left - PAD.right
  /* 左边留宽一点放名字 */
  const labelW = 104
  const innerH = H - PAD.top - PAD.bottom

  const mags = events.flatMap((e) => [e.magNoLens, e.magLensed])
  /* 星等轴反向: 亮的在左 */
  const lo = Math.max(16, Math.min(...mags) - 1)
  const hi = Math.max(...mags) + 1
  const left = PAD.left + labelW
  const sx = linear(lo, hi, left, PAD.left + innerW)

  const rowH = innerH / sorted.length
  const limitX = sx(limitMag)

  return (
    <figure className="chartpanel">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Five real lensed supernovae, showing apparent magnitude with and without lensing.">
        <rect
          x={limitX}
          y={PAD.top}
          width={Math.max(0, PAD.left + innerW - limitX)}
          height={innerH}
          fill="var(--red)"
          opacity={0.05}
        />

        {linearTicks(lo, hi, 5).map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--border)" />
            <text x={sx(t)} y={PAD.top + innerH + 17} textAnchor="middle" fill="var(--text-faint)" fontSize={11}>
              {nice(t, 0)}
            </text>
          </g>
        ))}

        <line
          x1={limitX}
          x2={limitX}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="var(--gold)"
          strokeWidth={1.6}
          strokeDasharray="6 4"
        />

        {sorted.map((e, i) => {
          const y = PAD.top + rowH * i + rowH / 2
          const xNo = sx(e.magNoLens)
          const xLensed = sx(e.magLensed)
          return (
            <g key={e.name}>
              <text x={PAD.left - 8} y={y + 4} textAnchor="end" fill="var(--text-dim)" fontSize={11}>
                {e.name}
              </text>
              {/* 连接线: 被看见的金色, 否则暗淡 */}
              <line
                x1={xLensed}
                x2={xNo}
                y1={y}
                y2={y}
                stroke={e.detectedLensed ? 'var(--gold)' : 'var(--border-bright)'}
                strokeWidth={1.6}
              />
              <circle cx={xNo} cy={y} r={5} fill="var(--red)" />
              <circle cx={xLensed} cy={y} r={5} fill={e.detectedLensed ? 'var(--lens-green-bright)' : 'var(--lens-green)'} />
              <text x={xLensed - 9} y={y - 6} textAnchor="end" fill="var(--text-faint)" fontSize={10}>
                {nice(e.magLensed, 1)}
              </text>
              <text x={xNo + 9} y={y - 6} textAnchor="start" fill="var(--text-faint)" fontSize={10}>
                {nice(e.magNoLens, 1)}
              </text>
            </g>
          )
        })}

        <line x1={left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--border-bright)" />
        <text x={(left + PAD.left + innerW) / 2} y={H - 8} textAnchor="middle" fill="var(--text-dim)" fontSize={12}>
          Apparent magnitude (brighter ←)
        </text>
      </svg>

      <figcaption className="chartpanel__cap">
        <span className="chartpanel__key"><i style={{ background: 'var(--red)' }} /> without lensing</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--lens-green-bright)' }} /> with lensing</span>
      </figcaption>
    </figure>
  )
}
