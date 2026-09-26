'use client'

import { Plus } from 'lucide-react'
import { useQuickAdd } from '@/components/quick-add/QuickAddProvider'

export function AddPurchaseButton({ carId, slotId }: { carId: string; slotId: string }) {
  const { open } = useQuickAdd()
  return (
    <button type="button" onClick={() => open({ carId, slotId })} className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium">
      <Plus size={16} aria-hidden />
      Add purchase
    </button>
  )
}
