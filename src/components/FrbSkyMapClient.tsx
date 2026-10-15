'use client'

import { clientOnly } from '@/components/three/clientOnly'
import type { FrbEvent } from '@/lib/types'

const FrbSkyMap = clientOnly(
  () => import('@/components/three/FrbSkyMap'),
  560,
)

export default function FrbSkyMapClient({
  events,
  survivors,
  claimed,
}: {
  events: FrbEvent[]
  survivors: string[]
  claimed: string[]
}) {
  return <FrbSkyMap events={events} survivors={survivors} claimed={claimed} />
}
