'use client'

import { useMemo, useState } from 'react'
import type { SupernovaeData } from '@/lib/types'

/**
 * 关卡一: 你是一台望远镜
 *
 * 拖动"探测极限"滑块, 自己找出答案:
 *   - 不加引力透镜时, 有几颗超新星能被看见?
 *   - 加上透镜后呢?
 *
 * 结论由数据直接得出, 不预先告诉玩家。
 */

const W = 720
const PAD = { top: 26, right: 118, bottom: 46, left: 52 }

export default function SupernovaExplorer({ data }: { data: SupernovaeData }) {
  // 初始探测极限 = 真实的 ZTF 极限 (m = 20.5), 不是随手取的数。
  // 这一档恰好给出本页的结论: 无透镜 0/5, 有透镜 2/5 —— 和页头那句话一致。
  const [limit, setLimit] = useState(data.limitingMag)
  const H = 300
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  // 星等范围按样本自适应
  const [minMag, maxMag] = useMemo(() => {
    const all = data.events.flatMap((e) => [e.magNoLens, e.magLensed])
    return [Math.floor(Math.min(...all) - 1), Math.ceil(Math.max(...all) + 1)]
  }, [data.events])

  /**
   * 视星等 -> x 坐标。
   * 星等数字越大越暗, 所以越靠右越暗 —— 和滑块的
   * "brighter (easier)" / "fainter (harder)" 方向一致。
   */
  const sx = (v: number) =>
    PAD.left + ((v - minMag) / (maxMag - minMag)) * innerW

  const sorted = useMemo(
    () => [...data.events].sort((a, b) => a.magNoLens - b.magNoLens),
    [data.events],
  )

  const nNoLens = data.events.filter((e) => e.magNoLens < limit).length
  const nLensed = data.events.filter((e) => e.magLensed < limit).length
  // 透镜把原本看不见的变成看得见的 (只算这一档)
  const newlyVisible = data.events.filter(
    (e) => e.magNoLens >= limit && e.magLensed < limit,
  )

  const rowH = innerH / sorted.length

  return (
    <div className="explorer">
      <div className="explorer__head">
        <div>
          <h3 className="sub-title">Your telescope&rsquo;s detection limit</h3>
          <p className="small muted" style={{ margin: 0, maxWidth: '52ch' }}>
            Drag the slider. Everything fainter than your limit stays invisible.
          </p>
        </div>
        <div className="explorer__readout">
          <span className="explorer__mag mono">m = {limit.toFixed(1)}</span>
        </div>
      </div>

      <input
        className="slider"
        type="range"
        min={minMag}
        max={maxMag}
        step={0.1}
        value={limit}
        onChange={(e) => setLimit(parseFloat(e.target.value))}
        aria-label="Detection limiting magnitude"
      />
      <div className="explorer__scale">
        <span className="small muted">brighter (easier)</span>
        <span className="small muted">fainter (harder)</span>
      </div>

      {/* ---------------------------------------------------- 星等图 */}
      <div className="explorer__chart">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img"
          aria-label="Supernova brightness with and without lensing">
          {/* 不可探测区: 比探测极限更暗的那一侧 (右边) */}
          <rect
            x={sx(limit)}
            y={PAD.top}
            width={Math.max(0, PAD.left + innerW - sx(limit))}
            height={innerH}
            fill="#c0392b"
            opacity={0.07}
          />

          {sorted.map((e, i) => {
            const y = PAD.top + rowH * (i + 0.5)
            const x1 = sx(e.magNoLens)
            const x2 = sx(e.magLensed)
            const visible = e.magLensed < limit
            const wasVisible = e.magNoLens < limit
            return (
              <g key={e.name}>
                {/* 行背景 */}
                <rect
                  x={PAD.left}
                  y={y - rowH / 2 + 2}
                  width={innerW}
                  height={rowH - 4}
                  fill={visible ? 'rgba(39,174,96,0.07)' : 'transparent'}
                  rx={4}
                />
                {/* 亮度提升的连接线 */}
                <line
                  x1={x1}
                  y1={y}
                  x2={x2}
                  y2={y}
                  stroke={visible ? '#ffb703' : '#3d4f73'}
                  strokeWidth={visible ? 3 : 2.2}
                  strokeLinecap="round"
                />
                {/* 无透镜 */}
                <circle cx={x1} cy={y} r={5.5} fill="#e05252" stroke="#0b1020" strokeWidth={1.4} />
                {/* 有透镜 */}
                <circle cx={x2} cy={y} r={5.5} fill="#27ae60" stroke="#0b1020" strokeWidth={1.4} />
                {/* 名称 + 放大率 */}
                <text x={PAD.left + innerW + 10} y={y + 4} fill="#9aabc7" fontSize={11.5}>
                  {e.name}
                </text>
                <text
                  x={PAD.left + innerW + 10}
                  y={y + 17}
                  fill={visible ? '#ffb703' : '#5a6b8c'}
                  fontSize={10.5}
                  fontWeight={600}
                >
                  μ={e.magnification.toFixed(1)}×
                  {visible && !wasVisible ? '  ← revealed' : ''}
                </text>
              </g>
            )
          })}

          {/* 探测极限竖线 */}
          <line
            x1={sx(limit)}
            x2={sx(limit)}
            y1={PAD.top - 8}
            y2={PAD.top + innerH + 4}
            stroke="#ffb703"
            strokeWidth={2}
            strokeDasharray="5 4"
          />

          {/* 轴 */}
          <line x1={PAD.left} x2={PAD.left + innerW} y1={PAD.top + innerH} y2={PAD.top + innerH} stroke="#2d3f63" />
          <line x1={PAD.left} x2={PAD.left} y1={PAD.top - 8} y2={PAD.top + innerH} stroke="#2d3f63" />

          {[0, 0.25, 0.5, 0.75, 1].map((f) => {
            const v = minMag + (maxMag - minMag) * f
            return (
              <g key={f}>
                <line
                  x1={sx(v)}
                  x2={sx(v)}
                  y1={PAD.top}
                  y2={PAD.top + innerH}
                  stroke="#1a2540"
                />
                <text
                  x={sx(v)}
                  y={PAD.top + innerH + 17}
                  textAnchor="middle"
                  fill="#6a7b98"
                  fontSize={11}
                >
                  {v.toFixed(0)}
                </text>
              </g>
            )
          })}
          <text x={PAD.left + innerW / 2} y={H - 8} textAnchor="middle" fill="#9aabc7" fontSize={12}>
            Apparent magnitude
          </text>
          <text x={PAD.left} y={H - 8} textAnchor="start" fill="#5a6b8c" fontSize={11}>
            ← brighter
          </text>
          <text x={PAD.left + innerW} y={H - 8} textAnchor="end" fill="#5a6b8c" fontSize={11}>
            fainter →
          </text>

          {/* 内部标签 */}
          <text x={PAD.left - 8} y={PAD.top - 12} fill="#e05252" fontSize={11} fontWeight={600}>
            ● without lensing
          </text>
          <text x={PAD.left + 118} y={PAD.top - 12} fill="#27ae60" fontSize={11} fontWeight={600}>
            ● with lensing
          </text>
        </svg>
      </div>

      {/* ---------------------------------------------------- 计数 */}
      <div className="explorer__counts">
        <Count
          value={nNoLens}
          total={data.sampleSize}
          label="visible without lensing"
          tone="red"
        />
        <Count
          value={nLensed}
          total={data.sampleSize}
          label="visible with lensing"
          tone="green"
        />
        <div className="explorer__reveal">
          {newlyVisible.length > 0 ? (
            <>
              <span className="badge badge--gold">
                {newlyVisible.length} revealed by lensing
              </span>
              <span className="small muted" style={{ marginTop: 6, display: 'block' }}>
                {newlyVisible
                  .map(
                    (e) =>
                      `${e.name} — μ = ${e.magnification.toFixed(1)}×, ` +
                      `${(e.magNoLens - e.magLensed).toFixed(1)} mag brighter`,
                  )
                  .join(' · ')}
              </span>
            </>
          ) : (
            <span className="small muted">
              Nothing is revealed at this limit. Drag the slider to the left
              (brighter) until lensing brings a supernova into view.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function Count({
  value,
  total,
  label,
  tone,
}: {
  value: number
  total: number
  label: string
  tone: 'red' | 'green'
}) {
  return (
    <div className="bigstat">
      <span className={`bigstat__value bigstat__value--${tone}`}>
        {value}
        <span style={{ color: 'var(--text-faint)', fontSize: '0.55em' }}> / {total}</span>
      </span>
      <span className="bigstat__label">{label}</span>
    </div>
  )
}
