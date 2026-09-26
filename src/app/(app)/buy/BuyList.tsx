'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { Car as CarIcon, Check, Search, ShoppingCart, TriangleAlert, Wrench } from 'lucide-react'
import { StatusDot } from '@/components/partsmap/StatusDot'
import { useQuickAdd } from '@/components/quick-add/QuickAddProvider'
import { EmptyState } from '@/components/ui/EmptyState'
import { SYSTEMS, SYSTEM_LABELS, type BuildStatus, type CarSystem, type Destination } from '@/lib/domain'
import { markBought } from './actions'

export type BuyItem = {
  slot_id: string
  car_id: string
  car_nickname: string
  system: CarSystem
  subsystem: string | null
  name: string
  required_qty: number
  have_qty: number
  fitment_notes: string | null
  destination: Destination
  build_status: BuildStatus
  needs_review: boolean
  status_label: string | null
}

type Group = { name: string; items: BuyItem[]; qty: number }

/** Open parts grouped by system, then by part, so a part several cars need reads as one line. */
export function BuyList({ items, cars, initialCar = 'all' }: { items: BuyItem[]; cars: { id: string; nickname: string }[]; initialCar?: string }) {
  const [car, setCar] = useState<string>(initialCar)
  const [query, setQuery] = useState('')
  const [hideReview, setHideReview] = useState(true)
  const [bought, setBought] = useState<Record<string, string>>({})

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter(
      (i) =>
        !bought[i.slot_id] &&
        (car === 'all' || i.car_id === car) &&
        (!hideReview || !i.needs_review) &&
        (!q || `${i.name} ${i.subsystem ?? ''} ${SYSTEM_LABELS[i.system]}`.toLowerCase().includes(q)),
    )
  }, [items, car, query, hideReview, bought])

  const bySystem = useMemo(() => {
    const out: { system: CarSystem; groups: Group[] }[] = []
    for (const system of SYSTEMS) {
      const inSystem = visible.filter((i) => i.system === system)
      if (!inSystem.length) continue
      const byName = new Map<string, BuyItem[]>()
      for (const i of inSystem) byName.set(i.name, [...(byName.get(i.name) ?? []), i])
      const groups = [...byName].map(([name, list]) => ({ name, items: list, qty: list.reduce((n, i) => n + Math.max(0, i.required_qty - i.have_qty), 0) }))
      groups.sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
      out.push({ system, groups })
    }
    return out
  }, [visible])

  const reviewCount = items.filter((i) => i.needs_review && (car === 'all' || i.car_id === car)).length
  const carCount = new Set(visible.map((i) => i.car_id)).size

  if (items.length === 0) {
    return <EmptyState title="Nothing left to buy">Parts show up here while their status counts as still needed.</EmptyState>
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Search parts</span>
          <Search aria-hidden size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search parts" className="h-11 w-full rounded-xl border border-border bg-surface pr-3 pl-9 text-base outline-none focus:border-accent" />
        </label>
        {cars.length > 1 && (
          <div role="radiogroup" aria-label="Car" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
            {[{ id: 'all', nickname: 'All cars' }, ...cars].map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={car === c.id}
                onClick={() => setCar(c.id)}
                className={`h-9 shrink-0 rounded-full border px-3 text-sm font-medium ${car === c.id ? 'border-text bg-text text-surface' : 'border-border text-muted'}`}
              >
                {c.nickname}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted">
            <span className="font-mono text-text">{visible.length}</span> parts to buy{carCount > 1 ? ` across ${carCount} cars` : ''}
          </span>
          {reviewCount > 0 && (
            <label className="flex items-center gap-2 text-muted">
              <input type="checkbox" checked={hideReview} onChange={(e) => setHideReview(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
              Hide {reviewCount} marked for review
            </label>
          )}
        </div>
      </div>

      {Object.keys(bought).length > 0 && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
          <Check aria-hidden size={16} />
          Marked {Object.keys(bought).length} as {Object.values(bought)[0]}.
        </p>
      )}

      {bySystem.length === 0 ? (
        <EmptyState title="No parts match">Try another car or search.</EmptyState>
      ) : (
        bySystem.map(({ system, groups }) => (
          <section key={system} aria-labelledby={`buy-${system}`}>
            <h2 id={`buy-${system}`} className="mb-2 flex items-baseline justify-between text-sm font-semibold text-muted">
              {SYSTEM_LABELS[system]}
              <span className="font-mono text-xs font-normal">{groups.reduce((n, g) => n + g.items.length, 0)}</span>
            </h2>
            <ul className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-surface">
              {groups.map((g) => (
                <li key={g.name} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-medium">{g.name}</h3>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {g.items.length > 1 ? `${g.items.length} cars · ` : ''}qty {g.qty}
                    </span>
                  </div>
                  <p className="inline-flex items-center gap-1 text-xs text-muted">
                    {g.items[0].destination === 'builder' ? <Wrench aria-hidden size={12} /> : <CarIcon aria-hidden size={12} />}
                    {g.items[0].destination === 'builder' ? 'Goes to the builder' : 'Installed on the car'}
                  </p>
                  {g.items[0].fitment_notes && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{g.items[0].fitment_notes}</p>}
                  <ul className="mt-2 space-y-1.5">
                    {g.items.map((i) => (
                      <CarLine key={i.slot_id} item={i} showCar={cars.length > 1} onBought={(label) => setBought((b) => ({ ...b, [i.slot_id]: label }))} />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

function CarLine({ item, showCar, onBought }: { item: BuyItem; showCar: boolean; onBought: (label: string) => void }) {
  const { open } = useQuickAdd()
  const [pending, start] = useTransition()
  const need = Math.max(0, item.required_qty - item.have_qty)
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl bg-bg px-3 py-2">
      <Link href={`/slots/${item.slot_id}`} className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline">
        <StatusDot bucket="need" size={10} />
        <span className="truncate">
          {showCar && <span className="font-medium">{item.car_nickname} · </span>}
          {item.status_label ?? item.build_status}
          {need > 1 && <span className="font-mono text-muted"> ×{need}</span>}
        </span>
        {item.needs_review && <TriangleAlert aria-label="Marked for review" size={13} className="shrink-0 text-warn" />}
      </Link>
      <div className="flex shrink-0 gap-1.5">
        <button
          type="button"
          onClick={() => open({ carId: item.car_id, slotId: item.slot_id })}
          className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-surface px-2.5 text-xs font-medium"
          aria-label={`Record a purchase of ${item.name}${showCar ? ` for ${item.car_nickname}` : ''}`}
        >
          <ShoppingCart aria-hidden size={13} />
          Buy
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await markBought(item.slot_id)
              if (res.ok) onBought(res.label!)
            })
          }
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-text px-2.5 text-xs font-semibold text-surface disabled:opacity-60"
          aria-label={`Mark ${item.name}${showCar ? ` for ${item.car_nickname}` : ''} as bought`}
        >
          <Check aria-hidden size={13} />
          Bought
        </button>
      </div>
    </li>
  )
}
