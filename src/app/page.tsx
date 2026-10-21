import HomeHero from '@/components/HomeHero'
import { getFrbs, getGravitationalWaves, getLenses, getSupernovae } from '@/lib/data'

export default function HomePage() {
  const { lenses } = getLenses()
  const { frbs } = getFrbs()
  const { gravitationalWaves } = getGravitationalWaves()
  const { supernovae } = getSupernovae()

  return (
    <main>
      <HomeHero
        lenses={lenses.sample}
        lensTotal={lenses.total}
        frbTotal={frbs.uniqueCount}
        gwTotal={gravitationalWaves.catalogTotal}
        snSampleSize={supernovae.sampleSize}
      />
    </main>
  )
}
