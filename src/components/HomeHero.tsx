'use client'

import Link from 'next/link'
import { clientOnly } from '@/components/three/clientOnly'
import type { LensPoint } from '@/lib/types'

const ParticleField = clientOnly(
  () => import('@/components/three/ParticleField'),
  520,
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
          <Stat value={lensTotal.toLocaleString()} label="Known gravitational lenses" />
          <Stat value={frbTotal.toLocaleString()} label="Fast radio bursts searched" />
          <Stat value={gwTotal.toLocaleString()} label="Gravitational-wave events" />
          <Stat value={String(snSampleSize)} label="Known lensed supernovae" />
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bigstat">
      <span className="bigstat__value">{value}</span>
      <span className="bigstat__label">{label}</span>
    </div>
  )
}
