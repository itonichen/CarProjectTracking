'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef } from 'react'
import { Car, Ellipsis, Plus, ShoppingCart, Truck, X } from 'lucide-react'
import { useQuickAdd } from '@/components/quick-add/QuickAddProvider'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import type { Theme } from '@/lib/theme'
import { MORE_HREFS, NAV_ITEMS, isActive } from './nav-items'

const CAR_PATH = /^\/cars\/([0-9a-f-]{36})/

/** Quick add, preselecting the car when you're on one of its pages. */
function useOpenQuickAdd() {
  const { open } = useQuickAdd()
  const pathname = usePathname()
  return () => open({ carId: CAR_PATH.exec(pathname)?.[1] })
}

/** Sidebar on screens 768px and up. */
export function Sidebar({ theme }: { theme: Theme }) {
  const pathname = usePathname()
  const quickAdd = useOpenQuickAdd()
  return (
    <aside className="hidden w-[216px] shrink-0 flex-col gap-5 border-r border-border px-3.5 py-7 md:flex">
      <div className="px-2.5 text-xs font-semibold tracking-[0.1em] text-muted">GARAGE</div>
      <button type="button" onClick={quickAdd} className="flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] bg-accent text-[15px] font-medium text-white hover:bg-accent-strong">
        <Plus aria-hidden size={17} />
        Quick add
      </button>
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`rounded-lg px-3 py-[9px] text-[15px] ${active ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-2'}`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="mt-auto px-2.5">
        <ThemeToggle initial={theme} compact />
      </div>
    </aside>
  )
}

/** Bottom tab bar under 768px: Garage · Buy list · + Add · Shipments · More. */
export function BottomTabs() {
  const pathname = usePathname()
  const quickAdd = useOpenQuickAdd()
  const more = useRef<HTMLDialogElement>(null)
  const moreActive = MORE_HREFS.some((h) => isActive(pathname, h))

  const tab = (active: boolean) => `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${active ? 'font-semibold text-accent' : 'text-text-2'}`

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex items-center border-t border-border bg-surface px-2 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))] md:hidden">
        <Link href="/garage" aria-current={isActive(pathname, '/garage') ? 'page' : undefined} className={tab(isActive(pathname, '/garage'))}>
          <Car aria-hidden size={20} />
          Garage
        </Link>
        <Link href="/buy" aria-current={isActive(pathname, '/buy') ? 'page' : undefined} className={tab(isActive(pathname, '/buy'))}>
          <ShoppingCart aria-hidden size={20} />
          Buy list
        </Link>
        <div className="flex min-h-12 flex-1 items-center justify-center">
          <button type="button" onClick={quickAdd} className="inline-flex items-center gap-1 rounded-[10px] bg-accent px-3.5 py-[9px] text-xs font-semibold text-white">
            <Plus aria-hidden size={15} />
            Add
          </button>
        </div>
        <Link href="/shipments" aria-current={isActive(pathname, '/shipments') ? 'page' : undefined} className={tab(isActive(pathname, '/shipments'))}>
          <Truck aria-hidden size={20} />
          Shipments
        </Link>
        <button type="button" onClick={() => more.current?.showModal()} aria-haspopup="dialog" className={tab(moreActive)}>
          <Ellipsis aria-hidden size={20} />
          More
        </button>
      </nav>

      <dialog
        ref={more}
        aria-label="More"
        onClick={(e) => e.target === e.currentTarget && more.current?.close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/40 md:hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">More</h2>
          <button type="button" onClick={() => more.current?.close()} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-lg text-muted">
            <X aria-hidden size={18} />
          </button>
        </div>
        <ul className="divide-y divide-divider">
          {NAV_ITEMS.filter((i) => MORE_HREFS.includes(i.href)).map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link href={href} onClick={() => more.current?.close()} className={`flex min-h-14 items-center gap-3 px-4 text-[15px] ${isActive(pathname, href) ? 'text-accent' : ''}`}>
                <Icon aria-hidden size={20} className="text-muted" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="h-[max(16px,env(safe-area-inset-bottom))]" />
      </dialog>
    </>
  )
}
