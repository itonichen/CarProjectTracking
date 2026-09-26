'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { PartStatus } from '@/components/partsmap/actions'
import { StatusPicker } from '@/components/partsmap/PartDetailPanel'

export function SlotStatusPicker({ slotId, current, statuses: initial }: { slotId: string; current: string | null; statuses: PartStatus[] }) {
  const router = useRouter()
  const [statuses, setStatuses] = useState(initial)
  return <StatusPicker slotId={slotId} current={current} statuses={statuses} onStatusesChange={setStatuses} onChange={() => setTimeout(() => router.refresh(), 400)} />
}
