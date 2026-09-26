'use client'

import { usePathname } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useQuickAdd } from './QuickAddProvider'

const CAR_PATH = /^\/cars\/([0-9a-f-]{36})/

/** Opens Quick add, preselecting the car when you're on one of its pages. */
export function QuickAddButton({ variant }: { variant: 'fab' | 'sidebar' }) {
  const { open } = useQuickAdd()
  const pathname = usePathname()
  const carId = CAR_PATH.exec(pathname)?.[1]
  const onClick = () => open({ carId })

  if (variant === 'sidebar') {
    return (
      <button type="button" onClick={onClick} className="mb-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white">
        <Plus aria-hidden size={18} />
        Quick add
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Quick add a part"
      className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 grid h-14 w-14 place-items-center rounded-full bg-accent text-white shadow-lg md:hidden"
    >
      <Plus aria-hidden size={26} />
    </button>
  )
}
