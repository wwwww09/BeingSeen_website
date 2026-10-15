'use client'

import { useMemo } from 'react'

/**
 * 纯 SVG 散点图 —— 模拟星表的 视星等 vs 源红移。
 * 用 SVG 而不是 Three.js / canvas, 因为点数已抽样到 3000 且需要精确的坐标轴。
 */

export interface ScatterChartProps {
  points: { x: number; y: number; detected: boolean }[]
  limitMag: number
  xLabel: string
  yLabel: string
  xDomain: [number, number]
  yDomain: [number, number]
  height?: number
}

const PAD = { top: 18, right: 16, bottom: 42, left: 52 }
const W = 720

export default function ScatterChart({
  points,
  limitMag,
  xLabel,
  yLabel,
  xDomain,
  yDomain,
  height = 340,
}: ScatterChartProps) {
  const H = height
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const sx = (v: number) =>
    PAD.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * innerW
  // y 轴反向: 星等越小(越亮)在下方
  const sy = (v: number) =>
    PAD.top + innerH - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * innerH

  const xTicks = useMemo(() => niceTicks(xDomain[0], xDomain[1], 6), [xDomain])
  const yTicks = useMemo(() => niceTicks(yDomain[0], yDomain[1], 6), [yDomain])

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label={`${yLabel} versus ${xLabel}`}
      style={{ display: 'block' }}
    >
      {/* 网格 */}
      {xTicks.map((t) => (
        <line
          key={`gx${t}`}
          x1={sx(t)}
          x2={sx(t)}
          y1={PAD.top}
          y2={PAD.top + innerH}
          stroke="#1a2540"
          strokeWidth={1}
        />
      ))}
      {yTicks.map((t) => (
        <line
          key={`gy${t}`}
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={sy(t)}
          y2={sy(t)}
          stroke="#1a2540"
          strokeWidth={1}
        />
      ))}

      {/* 探测极限以上的区域 (不可探测) */}
      <rect
        x={PAD.left}
        y={PAD.top}
        width={innerW}
        height={Math.max(0, sy(limitMag) - PAD.top)}
        fill="#c0392b"
        opacity={0.06}
      />

      {/* 散点 */}
      {points.map((p, i) => {
        const cx = sx(p.x)
        const cy = sy(p.y)
        if (cx < PAD.left - 2 || cx > PAD.left + innerW + 2) return null
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={p.detected ? 2.9 : 1.5}
            fill={p.detected ? '#ffb703' : '#3f5580'}
            opacity={p.detected ? 1 : 0.5}
          />
        )
      })}

      {/* 探测极限线 */}
      <line
        x1={PAD.left}
        x2={PAD.left + innerW}
        y1={sy(limitMag)}
        y2={sy(limitMag)}
        stroke="#ffb703"
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <text
        x={PAD.left + innerW - 4}
        y={sy(limitMag) - 6}
        textAnchor="end"
        fill="#ffb703"
        fontSize={11.5}
        fontWeight={600}
      >
        detection limit m = {limitMag.toFixed(1)}
      </text>

      {/* 坐标轴 */}
      <line
        x1={PAD.left}
        x2={PAD.left + innerW}
        y1={PAD.top + innerH}
        y2={PAD.top + innerH}
        stroke="#2d3f63"
      />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + innerH} stroke="#2d3f63" />

      {xTicks.map((t) => (
        <text
          key={`tx${t}`}
          x={sx(t)}
          y={PAD.top + innerH + 16}
          textAnchor="middle"
          fill="#6a7b98"
          fontSize={11}
        >
          {t}
        </text>
      ))}
      {yTicks.map((t) => (
        <text
          key={`ty${t}`}
          x={PAD.left - 8}
          y={sy(t) + 4}
          textAnchor="end"
          fill="#6a7b98"
          fontSize={11}
        >
          {t}
        </text>
      ))}

      <text
        x={PAD.left + innerW / 2}
        y={H - 6}
        textAnchor="middle"
        fill="#9aabc7"
        fontSize={12}
      >
        {xLabel}
      </text>
      <text
        x={14}
        y={PAD.top + innerH / 2}
        textAnchor="middle"
        fill="#9aabc7"
        fontSize={12}
        transform={`rotate(-90 14 ${PAD.top + innerH / 2})`}
      >
        {yLabel}
      </text>
    </svg>
  )
}

/** 生成"整齐"的刻度值 */
function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min
  if (span <= 0) return [min]
  const rawStep = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const norm = rawStep / mag
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag
  const start = Math.ceil(min / step) * step
  const out: number[] = []
  for (let v = start; v <= max + 1e-9; v += step) {
    out.push(Math.round(v * 1000) / 1000)
  }
  return out
}
