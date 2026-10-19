import { linear, log10, linearTicks, logTicks, nice } from './chartUtils'

/**
 * 角距 vs |ΔDM| —— 真正的透镜候选必须同时在"小角距"和"DM 相符"那个角落里。
 *
 * 原来是 public/charts/frb_dm_vs_separation.png (matplotlib 截图)。
 * 现在改成 SVG, 配色跟着站点走: 通过两组判据的点用淡青, 没通过的用灰玫瑰,
 * 那两对"早前被当成候选"的用金色圈出来。
 */

export interface FrbPair {
  frb1: string
  frb2: string
  sepDeg: number
  dmDiff: number
  claimed?: boolean
}

export default function FrbSeparationChart({
  pairs,
  dmCut = 30,
  sepCut = 1,
}: {
  pairs: FrbPair[]
  dmCut?: number
  sepCut?: number
}) {
  const W = 760
  const H = 360
  const PAD = { top: 22, right: 20, bottom: 46, left: 62 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  /*
   * 去重 + 只保留有意义的点。
   * 同一对 FRB 可能同时出现在几个列表里 (按 DM 排序、按角距排序、存活候选、
   * 早前被当成候选的), 所以合并而不是丢弃 —— 否则 claimed 标记会被先出现的
   * 那条覆盖掉, 金圈就不画了。
   */
  const byPair = new Map<string, FrbPair>()
  for (const p of pairs) {
    if (!(p.sepDeg > 0) || !(p.dmDiff > 0)) continue
    const k = `${p.frb1}|${p.frb2}`
    const prev = byPair.get(k)
    byPair.set(k, prev ? { ...prev, claimed: Boolean(prev.claimed || p.claimed) } : p)
  }
  const pts = [...byPair.values()]

  const xMax = 2.2
  const yMin = 1
  const yMax = 3000
  const sx = linear(0, xMax, PAD.left, PAD.left + innerW)
  const sy = log10(yMin, yMax, PAD.top + innerH, PAD.top)

  const passes = (p: FrbPair) => p.sepDeg < sepCut && p.dmDiff < dmCut

  return (
    <figure className="chartpanel chartpanel--wide">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Angular separation against dispersion measure difference for ${pts.length} burst pairs. A genuine lensed pair would need small separation and matching dispersion measure, and that corner is empty.`}
      >
        {/* "会被接受"的那个角落: 小角距 + DM 相符 */}
        <rect
          x={PAD.left}
          y={sy(dmCut)}
          width={sx(sepCut) - PAD.left}
          height={PAD.top + innerH - sy(dmCut)}
          fill="var(--lens-green-bright)"
          opacity={0.07}
        />

        {logTicks(yMin, yMax).map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--border)" />
            <text x={PAD.left - 10} y={sy(t) + 4} textAnchor="end" fill="var(--text-faint)" fontSize={11}>
              {t >= 1000 ? `${t / 1000}k` : String(t)}
            </text>
          </g>
        ))}

        {linearTicks(0, xMax, 5).map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--border)" />
            <text x={sx(t)} y={PAD.top + innerH + 18} textAnchor="middle" fill="var(--text-faint)" fontSize={11}>
              {nice(t, 1)}
            </text>
          </g>
        ))}

        {/* 两条判据线 */}
        <line
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={sy(dmCut)}
          y2={sy(dmCut)}
          stroke="var(--gold)"
          strokeWidth={1.5}
          strokeDasharray="7 5"
        />
        <text x={PAD.left + 6} y={sy(dmCut) - 7} fill="var(--gold)" fontSize={11}>
          |ΔDM| = {dmCut}
        </text>

        <line
          x1={sx(sepCut)}
          x2={sx(sepCut)}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="var(--text-dim)"
          strokeWidth={1.3}
          strokeDasharray="5 4"
          opacity={0.8}
        />
        <text x={sx(sepCut) + 6} y={PAD.top + 13} fill="var(--text-dim)" fontSize={11}>
          separation = {sepCut}°
        </text>

        {pts.map((p) => {
          const ok = passes(p)
          return (
            <g key={`${p.frb1}|${p.frb2}`}>
              {p.claimed && (
                <circle
                  cx={sx(p.sepDeg)}
                  cy={sy(p.dmDiff)}
                  r={10}
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth={2.2}
                />
              )}
              <circle
                cx={sx(p.sepDeg)}
                cy={sy(p.dmDiff)}
                r={4.5}
                fill={ok ? 'var(--lens-green-bright)' : 'var(--red-soft)'}
                opacity={ok ? 1 : 0.75}
              />
            </g>
          )
        })}

        <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="var(--border-bright)" />
        <text x={PAD.left + innerW / 2} y={H - 8} textAnchor="middle" fill="var(--text-dim)" fontSize={12}>
          Angular separation (degrees)
        </text>
        <text
          x={20}
          y={PAD.top + innerH / 2}
          textAnchor="middle"
          fill="var(--text-dim)"
          fontSize={12}
          transform={`rotate(-90 20 ${PAD.top + innerH / 2})`}
        >
          |ΔDM| (pc cm⁻³, log)
        </text>
      </svg>

      <figcaption className="chartpanel__cap">
        <span className="chartpanel__key"><i style={{ background: 'var(--lens-green-bright)' }} /> passes both cuts</span>
        <span className="chartpanel__key"><i style={{ background: 'var(--red-soft)' }} /> fails at least one</span>
        <span className="chartpanel__key"><i style={{ border: '1.5px solid var(--gold)' }} /> earlier claimed candidate</span>
      </figcaption>
    </figure>
  )
}
