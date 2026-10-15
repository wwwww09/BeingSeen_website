'use client'

import { useState } from 'react'
import { clientOnly } from '@/components/three/clientOnly'
import type { LensPoint, SupernovaEvent } from '@/lib/types'

/**
 * 页面二 (Lensing & SNe) 的 3D 空间分布图。
 *
 * 左边是天球: 每一个蓝点是一个已知的引力透镜系统, 颜色由红移决定;
 * 五颗金色星是真正被观测到的透镜超新星。
 * 右边列出这五个天体 —— 点列表或点星图上的金星都会互相高亮。
 */

const LensCatalogScene = clientOnly(
  () => import('@/components/three/LensCatalogScene'),
  560,
)

export default function LensCatalogExplorer({
  lenses,
  events,
  lensTotal,
  withRedshift,
}: {
  /** 已知透镜的抽样 (天球坐标 + 红移) */
  lenses: LensPoint[]
  /** 五个真实的透镜超新星 */
  events: SupernovaEvent[]
  lensTotal: number
  withRedshift: number
}) {
  const [selected, setSelected] = useState<number | null>(null)
  const active = selected === null ? null : (events[selected] ?? null)

  return (
    <div className="grid grid--sidebar" style={{ marginTop: 18 }}>
      {/* ---------------------------------------------------- 星图 */}
      <div className="canvas-wrap" style={{ height: 560 }}>
        <LensCatalogScene
          lenses={lenses}
          events={events}
          selected={selected}
          onSelect={setSelected}
        />

        <div className="skymap__legend">
          <div className="skymap__legend-row">
            <span className="skymap__swatch" style={{ background: '#4da3ff' }} />
            已知透镜 · 低红移
          </div>
          <div className="skymap__legend-row">
            <span className="skymap__swatch" style={{ background: '#ff9e6d' }} />
            已知透镜 · 高红移
          </div>
          <div className="skymap__legend-row">
            <span className="skymap__swatch" style={{ background: '#33507d' }} />
            没有红移测量
          </div>
          <div className="skymap__legend-row">
            <span className="skymap__swatch" style={{ background: '#ffd166' }} />
            真实 gISNe (×{events.length})
          </div>
        </div>

        <div className="canvas-hint">
          拖动旋转 · 滚轮缩放 · 点金色星看详情
        </div>
      </div>

      {/* ---------------------------------------------------- 侧栏 */}
      <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="panel">
          <div className="factrow">
            <div className="factrow__item">
              <span className="factrow__k">{lensTotal.toLocaleString()}</span>
              <span className="factrow__v">已知透镜</span>
            </div>
            <div className="factrow__item">
              <span className="factrow__k">{events.length}</span>
              <span className="factrow__v">被看见的超新星</span>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
            天球上画出了其中 {lenses.length.toLocaleString()} 个透镜系统
            （{withRedshift.toLocaleString()} 个有红移测量）。
            金色的是全部五个已知 gISNe —— 比例约为 1 :{' '}
            {Math.round(lensTotal / Math.max(1, events.length)).toLocaleString()}。
          </p>
        </div>

        <div className="panel">
          <p className="section__label" style={{ marginTop: 0 }}>
            五个被看见的天体
          </p>

          <ul className="storylist">
            {events.map((e, i) => (
              <li
                key={e.name}
                className={`storylist__item${
                  selected === i ? ' storylist__item--active' : ''
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelected(selected === i ? null : i)}
              >
                <div className="storylist__meta">
                  <span className="storylist__star">★ {e.name}</span>
                  {e.detectedLensed ? (
                    <span className="badge badge--green">visible</span>
                  ) : (
                    <span className="badge badge--red">still unseen</span>
                  )}
                </div>
                <p
                  className="storylist__body"
                  style={{ fontSize: 12.5, lineHeight: 1.5 }}
                >
                  z = {e.redshift.toFixed(3)} · μ = {e.magnification.toFixed(1)}×
                </p>
              </li>
            ))}
          </ul>
        </div>

        {active && (
          <div className="panel" style={{ borderColor: 'var(--gold)' }}>
            <div className="paircard__names" style={{ marginBottom: 10 }}>
              <span className="badge badge--gold">{active.name}</span>
              <span className="mono" style={{ fontSize: 12 }}>
                {active.ra.toFixed(2)}°, {active.dec.toFixed(2)}°
              </span>
            </div>
            <div className="paircard__metrics">
              <div>
                <div className="paircard__metric-k">无透镜时</div>
                <div className="paircard__metric-v">
                  m = {active.magNoLens.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="paircard__metric-k">有透镜时</div>
                <div className="paircard__metric-v paircard__metric-v--good">
                  m = {active.magLensed.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="paircard__metric-k">亮度提升</div>
                <div className="paircard__metric-v">
                  {(active.magNoLens - active.magLensed).toFixed(2)} mag
                </div>
              </div>
              <div>
                <div className="paircard__metric-k">时间延迟</div>
                <div className="paircard__metric-v">
                  {active.timeDelayDays === null
                    ? '—'
                    : `${active.timeDelayDays} d`}
                </div>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
              {active.detectedNoLens
                ? '即使没有透镜，这个天体也亮到能被看到。'
                : '如果没有引力透镜，这个天体在任何巡天里都是不可见的 —— 它之所以被看见，只因为中间恰好有一个星系弯折了它的光。'}
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}
