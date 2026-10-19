'use client'

import { useMemo, useState } from 'react'
import type { GwCandidate } from '@/lib/types'

/**
 * 关卡三: 引力波透镜能修正黑洞质量吗?
 *
 * 玩家拖动放大率 μ, 看观测质量如何缩小。
 * 物理依据 (标准引力波透镜关系):
 *     m_obs = m_true * sqrt(mu)   =>   m_true = m_obs / sqrt(mu)
 *
 * 单一透镜对所有像施加同一个放大率, 所以质量比保持不变 —
 * 两个质量必须用同一个 sqrt(mu) 修正。
 *
 * 这是"假设检验": 我们问的是"要让这些事件脱离质量间隙, 需要多大的放大率",
 * 而不是"我们测到了多大的放大率"。
 */

const W = 760
const H = 400
const PAD = { top: 34, right: 26, bottom: 56, left: 62 }
const GAP_LOWER = 45

/*
 * 判定"是否已经落到边界或以下"时的容差。
 *
 * 为什么必须要有: 要求的放大率是反解出来的 (sqrtMu = m1Obs / 45), 代回去算
 * 68 / (68/45) 得到的是 45.000000000000004 这种数, 严格比较 `<= 45` 为假 ——
 * 于是"正好压到边界"反而被判成"没出来"。滑块的步长 0.005 也够不到精确阈值。
 * 质量本身的报数精度是 0.1 M☉, 所以 0.05 的容差远小于任何有意义的差异。
 */
const AT_BOUNDARY = 0.05
const GAP_UPPER = 120

export default function MassCorrectionScene({ candidates }: { candidates: GwCandidate[] }) {
  // 最大的那个所需 sqrt(mu), 决定滑块上限
  const maxSqrtMu = useMemo(
    () => Math.max(...candidates.map((c) => c.sqrtMu)) * 1.25,
    [candidates],
  )

  const [sqrtMu, setSqrtMu] = useState(1)

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const maxMass = useMemo(() => {
    const obs = candidates.flatMap((c) => [c.m1Obs, c.m2Obs])
    return Math.ceil(Math.max(...obs, GAP_UPPER) / 10) * 10 + 10
  }, [candidates])

  const massToY = (m: number) => PAD.top + innerH - (m / maxMass) * innerH

  // 每个候选的判定
  const rows = candidates.map((c) => {
    const m1 = c.m1Obs / sqrtMu
    const m2 = c.m2Obs / sqrtMu
    /*
     * <= 而不是 <: 要求的放大率是按"把质量正好压到边界"反解的, 所以滑块
     * 拉到那个值时 m1 恰好等于 GAP_LOWER。间隙指的是边界以上, 正好落在边界
     * 就算已经出来了 —— 用严格小于的话, "Gap cleared" 永远出不来。
     */
    const m1Escaped = m1 <= GAP_LOWER + AT_BOUNDARY
    const m2Escaped = m2 <= GAP_LOWER + AT_BOUNDARY
    return { c, m1, m2, m1Escaped, m2Escaped, bothEscaped: m1Escaped && m2Escaped }
  })

  const allEscaped = rows.every((r) => r.bothEscaped)

  // 每个候选"脱离间隙"所需的最小 sqrt(mu)
  const reqSqrtMu = candidates.map((c) => c.m1Obs / GAP_LOWER)

  const barW = Math.min(26, innerW / (candidates.length * 4 + 2))

  return (
    <div className="explorer">
      <div className="explorer__head">
        <div>
          <h3 className="sub-title">Gravitational magnification μ</h3>
          <p className="small muted" style={{ margin: 0, maxWidth: '56ch' }}>
            A lens magnifies the signal. A louder signal is interpreted as a heavier
            black hole. Increase μ and the inferred masses drop
            (m<sub>true</sub> = m<sub>obs</sub>/√μ).
          </p>
        </div>
        <div className="explorer__readout">
          <span className="explorer__mag mono">
            √μ = {sqrtMu.toFixed(3)} &nbsp;·&nbsp; μ = {(sqrtMu * sqrtMu).toFixed(2)}
          </span>
        </div>
      </div>

      <input
        className="slider"
        type="range"
        min={1}
        max={maxSqrtMu}
        step={0.005}
        value={sqrtMu}
        onChange={(e) => setSqrtMu(parseFloat(e.target.value))}
        aria-label="Lensing magnification"
      />
      <div className="explorer__scale">
        <span className="small muted">no lensing (μ = 1)</span>
        <span className="small muted">strong lensing</span>
      </div>

      {/* ---------------------------------------------- 3D 条形图 */}
      <div className="explorer__chart chart-scroll">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          style={{ display: 'block' }}
          role="img"
          aria-label="Observed and corrected black hole masses as magnification increases"
        >
          {/* 质量间隙区域 */}
          <rect
            x={PAD.left}
            y={massToY(GAP_UPPER)}
            width={innerW}
            height={massToY(GAP_LOWER) - massToY(GAP_UPPER)}
            fill="var(--red)"
            opacity={0.09}
          />
          <line
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={massToY(GAP_LOWER)}
            y2={massToY(GAP_LOWER)}
            stroke="var(--gold)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          <text
            x={PAD.left + 8}
            y={massToY(GAP_LOWER) - 7}
            fill="var(--gold)"
            fontSize={11.5}
            fontWeight={600}
          >
            mass-gap boundary {GAP_LOWER} M☉
          </text>
          <text
            x={PAD.left + innerW - 8}
            y={massToY(GAP_UPPER) + 15}
            textAnchor="end"
            fill="var(--red)"
            fontSize={11.5}
            fontWeight={600}
          >
            pair-instability gap — theory says nothing here
          </text>

          {/* 网格 */}
          {Array.from({ length: 6 }).map((_, i) => {
            const m = (maxMass / 5) * i
            return (
              <g key={i}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={massToY(m)}
                  y2={massToY(m)}
                  stroke="var(--bg-elevated)"
                />
                <text
                  x={PAD.left - 8}
                  y={massToY(m) + 4}
                  textAnchor="end"
                  fill="var(--text-faint)"
                  fontSize={11}
                >
                  {m.toFixed(0)}
                </text>
              </g>
            )
          })}

          {/* 条形 */}
          {rows.map((r, ci) => {
            const groupX = PAD.left + (innerW / candidates.length) * (ci + 0.5)
            return (
              <g key={r.c.name}>
                {/* 观测质量 (绿色, 当前 μ 下推断出来的) */}
                <Bar3D
                  x={groupX - barW * 1.5}
                  base={PAD.top + innerH}
                  height={(r.m1 / maxMass) * innerH}
                  width={barW}
                  color="var(--accent)"
                />
                <Bar3D
                  x={groupX + barW * 0.5}
                  base={PAD.top + innerH}
                  height={(r.m2 / maxMass) * innerH}
                  width={barW}
                  color="var(--lens-green)"
                />

                {/* 原始观测值 (红色轮廓, 静态参考) */}
                <GhostBar
                  x={groupX - barW * 1.5}
                  base={PAD.top + innerH}
                  height={(r.c.m1Obs / maxMass) * innerH}
                  width={barW}
                />
                <GhostBar
                  x={groupX + barW * 0.5}
                  base={PAD.top + innerH}
                  height={(r.c.m2Obs / maxMass) * innerH}
                  width={barW}
                />

                {/* 数值标签 */}
                <text
                  x={groupX - barW}
                  y={massToY(r.m1) - 7}
                  textAnchor="middle"
                  fill={r.m1Escaped ? 'var(--lens-green-bright)' : 'var(--red-soft)'}
                  fontSize={12}
                  fontWeight={700}
                >
                  {r.m1.toFixed(1)}
                </text>
                <text
                  x={groupX + barW * 2}
                  y={massToY(r.m2) - 7}
                  textAnchor="middle"
                  fill={r.m2Escaped ? 'var(--lens-green-bright)' : 'var(--red-soft)'}
                  fontSize={12}
                  fontWeight={700}
                >
                  {r.m2.toFixed(1)}
                </text>

                {/* 事件名 */}
                <text
                  x={groupX}
                  y={PAD.top + innerH + 20}
                  textAnchor="middle"
                  fill="var(--text-dim)"
                  fontSize={11}
                >
                  {r.c.name}
                </text>
                <text
                  x={groupX}
                  y={PAD.top + innerH + 36}
                  textAnchor="middle"
                  fill={r.bothEscaped ? 'var(--lens-green-bright)' : 'var(--text-faint)'}
                  fontSize={10.5}
                  fontWeight={600}
                >
                  {r.bothEscaped ? '✓ escaped the gap' : 'in the gap'}
                </text>
              </g>
            )
          })}

          {/* 轴 */}
          <line
            x1={PAD.left}
            x2={PAD.left + innerW}
            y1={PAD.top + innerH}
            y2={PAD.top + innerH}
            stroke="var(--border-bright)"
          />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top - 10} y2={PAD.top + innerH} stroke="var(--border-bright)" />
          <text
            x={16}
            y={PAD.top + innerH / 2}
            textAnchor="middle"
            fill="var(--text-dim)"
            fontSize={12}
            transform={`rotate(-90 16 ${PAD.top + innerH / 2})`}
          >
            Inferred mass (M☉)
          </text>
        </svg>
      </div>

      {/* 图例 */}
      <div className="explorer__legend">
        <span className="small">
          <span className="swatch" style={{ background: 'var(--accent)' }} /> m₁ after correction
        </span>
        <span className="small">
          <span className="swatch" style={{ background: 'var(--lens-green)' }} /> m₂ after correction
        </span>
        <span className="small">
          <span className="swatch swatch--ghost" /> observed (μ = 1)
        </span>
      </div>

      {/* ---------------------------------------------- 反馈 */}
      <div className="explorer__counts">
        <div className="bigstat">
          <span className="bigstat__value bigstat__value--gold">
            {(sqrtMu * sqrtMu).toFixed(2)}
          </span>
          <span className="bigstat__label">magnification μ</span>
        </div>
        <div className="bigstat">
          <span
            className={`bigstat__value ${
              allEscaped ? 'bigstat__value--green' : 'bigstat__value--red'
            }`}
          >
            {rows.filter((r) => r.bothEscaped).length} / {rows.length}
          </span>
          <span className="bigstat__label">events pulled out of the gap</span>
        </div>
        <div className="explorer__reveal">
          {allEscaped ? (
            <>
              <span className="badge badge--green">Gap cleared</span>
              <span className="small muted" style={{ marginTop: 6, display: 'block' }}>
                Both events now sit at or below {GAP_LOWER} M☉. Required magnification:{' '}
                {reqSqrtMu.map((s, i) => (
                  <span key={i}>
                    {i > 0 && ' · '}
                    {candidates[i].name.split('_')[0]} μ ={' '}
                    {(s * s).toFixed(2)}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <span className="small muted">
              Raise μ until every mass falls below the boundary. The required value
              differs per event — that is the testable prediction.
            </span>
          )}
        </div>
      </div>

      {/* 所需放大率的快捷跳转 */}
      <div className="explorer__actions">
        <button className="btn btn--sm" onClick={() => setSqrtMu(1)}>
          Reset (μ = 1)
        </button>
        {candidates.map((c, i) => (
          <button
            key={c.name}
            className="btn btn--sm"
            onClick={() => setSqrtMu(reqSqrtMu[i])}
          >
            {c.name.split('_')[0]}: needs μ = {(reqSqrtMu[i] ** 2).toFixed(2)}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 伪 3D 柱: 正面 + 顶面 + 侧面 */
function Bar3D({
  x,
  base,
  height,
  width,
  color,
}: {
  x: number
  base: number
  height: number
  width: number
  color: string
}) {
  const depth = 7
  const top = base - height
  return (
    <g>
      {/* 侧面 */}
      <polygon
        points={`${x + width},${top} ${x + width + depth},${top - depth} ${x + width + depth},${base - depth} ${x + width},${base}`}
        fill={color}
        opacity={0.55}
      />
      {/* 顶面 */}
      <polygon
        points={`${x},${top} ${x + depth},${top - depth} ${x + width + depth},${top - depth} ${x + width},${top}`}
        fill={color}
        opacity={0.8}
      />
      {/* 正面 */}
      <rect x={x} y={top} width={width} height={height} fill={color} />
    </g>
  )
}

/** 原始观测值的虚线轮廓 */
function GhostBar({
  x,
  base,
  height,
  width,
}: {
  x: number
  base: number
  height: number
  width: number
}) {
  return (
    <rect
      x={x}
      y={base - height}
      width={width}
      height={height}
      fill="none"
      stroke="var(--red)"
      strokeWidth={1.4}
      strokeDasharray="4 3"
      opacity={0.7}
    />
  )
}
