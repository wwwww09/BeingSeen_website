import { linear, linearTicks, nice } from './chartUtils'

/**
 * 观测质量 vs 透镜修正后的质量 (带误差棒)。
 *
 * 原来是 public/charts/gw_mass_correction.png —— 一张 matplotlib 柱状图, 四种
 * 饱和色 (红/蓝/橙/绿), 字体和配色都跟站点无关。
 *
 * 现在用单色调表达, 靠**明暗**而不是色相来区分:
 *   实心 = 透镜修正后的值    半透明 = 观测值
 *   蓝   = 主星 m1            紫   = 次星 m2
 * 那两条金色虚线是质量间隙的下边界 —— 全站唯一的高光色, 和别处同义。
 */

export interface GwMassCandidate {
  name: string
  m1Obs: number
  m2Obs: number
  m1Corr: number
  m2Corr: number
  m1ObsRange: [number, number]
  m1CorrRange: [number, number]
  m2ObsRange: [number, number]
  m2CorrRange: [number, number]
}

export default function GwMassChart({
  candidates,
  gapLowerBound,
}: {
  candidates: GwMassCandidate[]
  gapLowerBound: number
}) {
  const W = 760
  const H = 340
  const PAD = { top: 24, right: 18, bottom: 44, left: 56 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const all = candidates.flatMap((c) => [
    ...c.m1ObsRange,
    ...c.m1CorrRange,
    ...c.m2ObsRange,
    ...c.m2CorrRange,
  ])
  const yMax = Math.ceil(Math.max(...all) / 10) * 10
  const sy = linear(0, yMax, PAD.top + innerH, PAD.top)

  const groupW = innerW / candidates.length
  const barW = Math.min(26, (groupW - 30) / 4)
  const gap = 3

  const series = [
    { key: 'm1Obs', label: 'm₁ observed', color: 'var(--accent)', faded: true },
    { key: 'm1Corr', label: 'm₁ corrected', color: 'var(--accent)', faded: false },
    { key: 'm2Obs', label: 'm₂ observed', color: 'var(--violet)', faded: true },
    { key: 'm2Corr', label: 'm₂ corrected', color: 'var(--violet)', faded: false },
  ] as const

  return (
    <figure className="chartpanel chartpanel--wide">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Observed and lensing-corrected black hole masses for ${candidates.length} events, with error bars and the mass gap boundary at ${gapLowerBound} solar masses.`}
      >
        {linearTicks(0, yMax, 5).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
            <text x={PAD.left - 10} y={sy(t) + 4} textAnchor="end" fill="var(--text-faint)" fontSize={11}>
              {nice(t, 0)}
            </text>
          </g>
        ))}

        {/* 质量间隙下边界 */}
        <line
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={sy(gapLowerBound)}
          y2={sy(gapLowerBound)}
          stroke="var(--gold)"
          strokeWidth={1.6}
          strokeDasharray="7 5"
        />
        <text x={PAD.left + innerW} y={sy(gapLowerBound) - 7} textAnchor="end" fill="var(--gold)" fontSize={11}>
          mass-gap boundary {gapLowerBound} M☉
        </text>

        {candidates.map((c, gi) => {
          const cx = PAD.left + groupW * gi + groupW / 2
          const startX = cx - (barW * 4 + gap * 3) / 2
          return (
            <g key={c.name}>
              {series.map((s, si) => {
                const value = c[s.key]
                const range = c[`${s.key}Range` as const]
                const x = startX + si * (barW + gap)
                const y = sy(value)
                return (
                  <g key={s.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={PAD.top + innerH - y}
                      fill={s.color}
                      opacity={s.faded ? 0.42 : 1}
                      rx={1.5}
                    />
                    {/* 误差棒 */}
                    <line
                      x1={x + barW / 2}
                      x2={x + barW / 2}
                      y1={sy(range[0])}
                      y2={sy(range[1])}
                      stroke="var(--text-dim)"
                      strokeWidth={1}
                      opacity={0.75}
                    />
                    <line x1={x + barW / 2 - 3.5} x2={x + barW / 2 + 3.5} y1={sy(range[0])} y2={sy(range[0])} stroke="var(--text-dim)" strokeWidth={1} opacity={0.75} />
                    <line x1={x + barW / 2 - 3.5} x2={x + barW / 2 + 3.5} y1={sy(range[1])} y2={sy(range[1])} stroke="var(--text-dim)" strokeWidth={1} opacity={0.75} />
                  </g>
                )
              })}
              <text
                x={cx}
                y={PAD.top + innerH + 20}
                textAnchor="middle"
                fill="var(--text-dim)"
                fontSize={11}
              >
                {c.name}
              </text>
            </g>
          )
        })}

        <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--border-bright)" />
        <text
          x={16}
          y={PAD.top + innerH / 2}
          textAnchor="middle"
          fill="var(--text-dim)"
          fontSize={12}
          transform={`rotate(-90 16 ${PAD.top + innerH / 2})`}
        >
          Mass (M☉)
        </text>
      </svg>

      <figcaption className="chartpanel__cap">
        <span className="chartpanel__key"><i style={{ background: 'var(--accent)' }} /> m₁ corrected</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--accent)', opacity: 0.42 }} /> m₁ observed</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--violet)' }} /> m₂ corrected</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--violet)', opacity: 0.42 }} /> m₂ observed</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--gold)' }} /> mass-gap boundary</span>
      </figcaption>
    </figure>
  )
}
