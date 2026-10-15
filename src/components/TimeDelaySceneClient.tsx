'use client'

import { clientOnly } from '@/components/three/clientOnly'

const FrbTimeDelayScene = clientOnly(
  () => import('@/components/three/TimeDelayScene'),
  520,
)

export default function TimeDelaySceneClient() {
  return <FrbTimeDelayScene />
}
