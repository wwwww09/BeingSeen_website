import type {
  FrbsData,
  GravitationalWavesData,
  LensesData,
  MockSupernovaeData,
  SupernovaeData,
} from './types'

import frbsJson from '../../public/data/frbs.json'
import gwJson from '../../public/data/gravitational-waves.json'
import lensesJson from '../../public/data/lenses.json'
import sneJson from '../../public/data/supernovae.json'

/**
 * 数据在构建时被内联进 bundle。
 * 这样避免运行时的 fetch 往返, 也保证 Vercel 上的静态渲染不会出现空数据。
 */
export function getSupernovae(): {
  supernovae: SupernovaeData
  mockSupernovae: MockSupernovaeData
} {
  return sneJson as unknown as {
    supernovae: SupernovaeData
    mockSupernovae: MockSupernovaeData
  }
}

export function getFrbs(): { frbs: FrbsData } {
  return frbsJson as unknown as { frbs: FrbsData }
}

export function getGravitationalWaves(): { gravitationalWaves: GravitationalWavesData } {
  return gwJson as unknown as { gravitationalWaves: GravitationalWavesData }
}

export function getLenses(): { lenses: LensesData } {
  return lensesJson as unknown as { lenses: LensesData }
}
