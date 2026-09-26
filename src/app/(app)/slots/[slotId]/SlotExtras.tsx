'use client'

import { useRouter } from 'next/navigation'
import type { PartDetail } from '@/components/partsmap/actions'
import { LinkPayment, Notes } from '@/components/partsmap/part-controls'

export function SlotNotes({ slotId, notes }: { slotId: string; notes: string | null }) {
  return <Notes slotId={slotId} initial={notes ?? ''} />
}

export function SlotLinkPayment({ slotId, unassigned }: { slotId: string; unassigned: PartDetail['unassigned'] }) {
  const router = useRouter()
  return <LinkPayment slotId={slotId} unassigned={unassigned} onLinked={() => router.refresh()} />
}
