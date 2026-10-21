'use client'

import Link from 'next/link'
import { clientOnly } from '@/components/three/clientOnly'
import type { LensPoint } from '@/lib/types'
import { Cite, References, type Ref } from '@/components/References'

// 首页星场是纯装饰背景: 没有 WebGL 时静默跳过, 不要弹一个"3D 不可用"的框
// (它后面本来就有 CSS 径向渐变)
const ParticleField = clientOnly(
  () => import('@/components/three/ParticleField'),
  520,
  { silent: true },
)

export default function HomeHero({
  lenses,
  lensTotal,
  frbTotal,
  gwTotal,
  snSampleSize,
}: {
  lenses: LensPoint[]
  lensTotal: number
  frbTotal: number
  gwTotal: number
  snSampleSize: number
}) {
  /*
   * 首页四个统计各自的出处。条目先留空, 页面上显示 "entry to be added";
   * what 写清楚这条支撑哪个数字, 方便逐条填。
   */
  const refs: Ref[] = [
    { n: 1, what: `Known gravitational lenses (N = ${lensTotal.toLocaleString()}) — lens catalogue` },
    { n: 2, what: `Fast radio bursts in the catalogue (N = ${frbTotal.toLocaleString()}) — CHIME/FRB` },
    { n: 3, what: `Gravitational-wave events (N = ${gwTotal.toLocaleString()}) — GWTC-5.0` },
    { n: 4, what: `Lensed supernovae in this sample (N = ${snSampleSize}) — five published events` },
  ]

  return (
    <div className="hero">
      <div className="hero__scene" aria-hidden="true">
        <ParticleField lenses={lenses} />
      </div>

      <div className="hero__content">
        <div className="hero__inner fade-up">
          <span className="badge badge--gold">A serious game</span>

          <h1 className="title hero__title">Being Seen</h1>

          <p className="hero__quote">
            &ldquo;The universe has its own telescope.
            <br />
            We just need to learn how to look.&rdquo;
          </p>

          <p className="lede hero__lede">
            This project explores how gravitational lensing — the bending of light
            by massive objects — helps us detect astronomical phenomena that would
            otherwise remain invisible. From supernovae to fast radio bursts to
            gravitational waves, we quantify how much the universe reveals when we
            let it do the work.
          </p>

          <div className="hero__actions">
            <Link href="/lensing-supernovae" className="btn btn--primary">
              Explore the Unseen <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="hero__stats">
        <div className="hero__stats-inner">
          <Stat value={lensTotal.toLocaleString()} label="Known gravitational lenses" cite={1} />
          {/*
            原来写的是 536 "searched" —— 但搜索池是 474 个**非重复**暴
            (62 个重复暴按构造被排除), 页面第三页用的也是 474。
            这里改成"目录里有多少", 不再暗示这些都被搜过。
          */}
          <Stat value={frbTotal.toLocaleString()} label="Fast radio bursts catalogued" cite={2} />
          <Stat value={gwTotal.toLocaleString()} label="Gravitational-wave events" cite={3} />
          <Stat value={String(snSampleSize)} label="Lensed supernovae in this sample" cite={4} />
        </div>
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  cite,
}: {
  value: string
  label: string
  /** 本页出处编号, 见下面的 REFS */
  cite?: number
}) {
  return (
    <div className="bigstat">
      <span className="bigstat__value">{value}</span>
      <span className="bigstat__label">
        {label}
        {cite ? <Cite n={cite} /> : null}
      </span>
    </div>
  )
}
