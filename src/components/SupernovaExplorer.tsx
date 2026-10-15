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
  const [limit, setLimit] = useState(26)
  const H = 300
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  // 星等范围按样本自适应
  const [minMag, maxMag] = useMemo(() => {
    const all = data.events.flatMap((e) => [e.magNoLens, e.magLensed])
    return [Math.floor(Math.min(...all) - 1), Math.ceil(Math.max(...all) + 1)]
  }, [data.events])

  const sy = (v: number) =>
    PAD.top + innerH - ((v - minMag) / (maxMag - minMag)) * innerH

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
          {/* 不可探测区阴影 */}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={Math.max(0, sy(limit) - PAD.top)}
            fill="#c0392b"
            opacity={0.07}
          />

          {sorted.map((e, i) => {
            const y = PAD.top + rowH * (i + 0.5)
            const x1 = PAD.left + ((e.magNoLens - minMag) / (maxMag - minMag)) * innerW
            const x2 = PAD.left + ((e.magLensed - minMag) / (maxMag - minMag)) * innerW
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
            x1={PAD.left + ((limit - minMag) / (maxMag - minMag)) * innerW}
            x2={PAD.left + ((limit - minMag) / (maxMag - minMag)) * innerW}
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
                  x1={PAD.left}
                  x2={PAD.left + innerW}
                  y1={sy(v)}
                  y2={sy(v)}
                  stroke="#1a2540"
                />
                <text
                  x={PAD.left + ((v - minMag) / (maxMag - minMag)) * innerW}
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
            Apparent magnitude (brighter →)
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
                {newlyVisible.map((e) => e.name).join(', ')} — the two most strongly
                magnified systems (μ = {newlyVisible.map((e) => e.magnification.toFixed(0)).join(', ')}×).
              </span>
            </>
          ) : (
            <span className="small muted">
              Move the slider brighter to reveal lensed supernovae.
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
