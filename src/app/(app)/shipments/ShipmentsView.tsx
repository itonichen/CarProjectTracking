'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { Check, ExternalLink, PackageCheck, Send, Truck, Wrench } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SYSTEM_LABELS, type CarSystem } from '@/lib/domain'
import { formatCents } from '@/lib/money'
import { trackingUrl } from '@/lib/schemas/shipment'
import { createBuilderShipment, markDelivered, type ShipState } from './actions'

export type ReadyPart = { id: string; name: string; system: CarSystem; carId: string; car: string; status: string }
export type ShipmentCard = {
  id: string
  carrier: string | null
  tracking_number: string | null
  from_label: string | null
  to_label: string | null
  shipped_at: string | null
  delivered_at: string | null
  cost_cents: number
  notes: string | null
  items: { id: string; name: string; car: string; slotId: string | null }[]
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtDate = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : '')
const field = 'mt-1 block h-10 w-full rounded-lg border border-border bg-bg px-2.5 text-base outline-none focus:border-accent'

export function ShipmentsView({ ready, shipments, atBuilder, defaultTo }: { ready: ReadyPart[]; shipments: ShipmentCard[]; atBuilder: { id: string; name: string; car: string }[]; defaultTo: string }) {
  const inTransit = shipments.filter((s) => !s.delivered_at)
  const delivered = shipments.filter((s) => s.delivered_at)
  const builderByCar = group(atBuilder, (p) => p.car)

  return (
    <div className="space-y-8">
      <ReadyToShip parts={ready} defaultTo={defaultTo} />

      <section aria-labelledby="transit-h">
        <h2 id="transit-h" className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
          <Truck aria-hidden size={16} />
          In transit
          <span className="font-mono text-xs font-normal">{inTransit.length}</span>
        </h2>
        {inTransit.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Nothing on the way to the builder.</p>
        ) : (
          <ul className="space-y-3">
            {inTransit.map((s) => (
              <Shipment key={s.id} s={s} />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="builder-h">
        <h2 id="builder-h" className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
          <Wrench aria-hidden size={16} />
          At the builder
          <span className="font-mono text-xs font-normal">{atBuilder.length}</span>
        </h2>
        {atBuilder.length === 0 ? (
          <p className="rounded-[18px] border border-dashed border-border px-4 py-5 text-center text-sm text-muted">No parts at the builder yet.</p>
        ) : (
          <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
            {[...builderByCar].map(([car, parts]) => (
              <div key={car}>
                {builderByCar.size > 1 && <h3 className="bg-surface-2/60 px-4 py-1.5 text-xs font-semibold text-muted">{car}</h3>}
                <ul className="divide-y divide-border">
                  {parts.map((p) => (
                    <li key={p.id}>
                      <Link href={`/slots/${p.id}`} className="block px-4 py-2.5 text-sm hover:bg-surface-2">
                        {p.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {delivered.length > 0 && (
        <section aria-labelledby="delivered-h">
          <h2 id="delivered-h" className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
            <PackageCheck aria-hidden size={16} />
            Delivered
            <span className="font-mono text-xs font-normal">{delivered.length}</span>
          </h2>
          <ul className="space-y-3">
            {delivered.map((s) => (
              <Shipment key={s.id} s={s} />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function ReadyToShip({ parts, defaultTo }: { parts: ReadyPart[]; defaultTo: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [form, setForm] = useState(false)
  const [state, setState] = useState<ShipState>({})
  const [pending, start] = useTransition()
  const byCar = useMemo(() => group(parts, (p) => p.car), [parts])
  const today = new Date().toISOString().slice(0, 10)
  const err = (k: string) => state.errors?.[k]?.[0]

  const toggle = (id: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s)
      if (on) n.add(id)
      else n.delete(id)
      return n
    })

  function submit(fd: FormData) {
    start(async () => {
      const res = await createBuilderShipment({
        slot_ids: [...selected],
        carrier: String(fd.get('carrier') ?? ''),
        tracking_number: String(fd.get('tracking_number') ?? ''),
        to_label: String(fd.get('to_label') ?? ''),
        shipped_at: String(fd.get('shipped_at') ?? ''),
        cost: String(fd.get('cost') ?? ''),
        notes: String(fd.get('notes') ?? ''),
      })
      setState(res)
      if (res.ok) {
        setSelected(new Set())
        setForm(false)
      }
    })
  }

  return (
    <section aria-labelledby="ready-h">
      <h2 id="ready-h" className="mb-1 flex items-center gap-2 text-sm font-semibold text-muted">
        <Send aria-hidden size={16} />
        Ready to ship to the builder
        <span className="font-mono text-xs font-normal">{parts.length}</span>
      </h2>
      <p className="mb-2 text-xs text-muted">Bought parts that go to the builder and haven’t been sent yet.</p>
      {state.ok && (
        <p role="status" className="mb-2 flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
          <Check aria-hidden size={16} />
          Shipment created. Those parts are now “Shipped to Builder”.
        </p>
      )}
      {parts.length === 0 ? (
        <EmptyState title="Nothing waiting to ship">Parts headed to the builder show up here once they’re bought.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[18px] border border-border bg-surface">
          {[...byCar].map(([car, list]) => (
            <div key={car}>
              <h3 className="flex items-center justify-between bg-surface-2/60 px-4 py-1.5 text-xs font-semibold text-muted">
                {car}
                <button type="button" onClick={() => list.forEach((p) => toggle(p.id, true))} className="font-medium underline">
                  Select all
                </button>
              </h3>
              <ul className="divide-y divide-border">
                {list.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-2">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={(e) => toggle(p.id, e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--accent)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{p.name}</span>
                        <span className="block text-xs text-muted">
                          {SYSTEM_LABELS[p.system]} · {p.status}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="border-t border-border p-3">
            {!form ? (
              <button type="button" disabled={selected.size === 0} onClick={() => setForm(true)} className="h-11 w-full rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-50">
                {selected.size ? `Ship ${selected.size} ${selected.size === 1 ? 'part' : 'parts'} to the builder` : 'Select parts to ship'}
              </button>
            ) : (
              <form action={submit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm">
                    <span className="font-medium">Carrier</span>
                    <input name="carrier" list="carriers" placeholder="UPS" className={field} />
                    <datalist id="carriers">
                      <option value="UPS" />
                      <option value="FedEx" />
                      <option value="USPS" />
                      <option value="DHL" />
                      <option value="Dropped off" />
                    </datalist>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Tracking number</span>
                    <input name="tracking_number" autoCapitalize="characters" className={field} />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Shipped</span>
                    <input name="shipped_at" type="date" defaultValue={today} className={field} />
                    {err('shipped_at') && <span role="alert" className="text-xs text-accent-strong">{err('shipped_at')}</span>}
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Shipping cost ($)</span>
                    <input name="cost" inputMode="decimal" placeholder="0" className={field} />
                    {err('cost') && <span role="alert" className="text-xs text-accent-strong">{err('cost')}</span>}
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="font-medium">To</span>
                  <input name="to_label" defaultValue={defaultTo} className={field} />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Notes</span>
                  <input name="notes" className={field} />
                </label>
                {(state.message || err('slot_ids')) && <p role="alert" className="text-sm text-accent-strong">{state.message ?? err('slot_ids')}</p>}
                <div className="flex gap-2">
                  <button disabled={pending} className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-white disabled:opacity-60">
                    {pending ? 'Saving…' : `Create shipment (${selected.size})`}
                  </button>
                  <button type="button" onClick={() => setForm(false)} className="h-11 rounded-xl border border-border px-4 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function Shipment({ s }: { s: ShipmentCard }) {
  const url = trackingUrl(s.carrier, s.tracking_number)
  return (
    <li className="rounded-[18px] border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 px-4 pt-3">
        <div className="min-w-0">
          <p className="font-medium">
            {s.carrier ?? 'Shipment'} to {s.to_label ?? 'builder'}
          </p>
          <p className="text-xs text-muted">
            {[s.shipped_at && `Shipped ${fmtDate(s.shipped_at)}`, s.delivered_at && `delivered ${fmtDate(s.delivered_at)}`, s.cost_cents ? formatCents(s.cost_cents) : null].filter(Boolean).join(' · ')}
          </p>
          {s.tracking_number && (
            <p className="mt-0.5 font-mono text-xs">
              {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                  {s.tracking_number}
                  <ExternalLink aria-hidden size={11} />
                </a>
              ) : (
                s.tracking_number
              )}
            </p>
          )}
        </div>
        {!s.delivered_at && (
          <form action={markDelivered}>
            <input type="hidden" name="id" value={s.id} />
            <button className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-2">
              <PackageCheck aria-hidden size={15} />
              Delivered
            </button>
          </form>
        )}
      </div>
      <ul className="mt-2 divide-y divide-border border-t border-border">
        {s.items.map((i) => (
          <li key={i.id} className="px-4 py-2 text-sm">
            {i.slotId ? (
              <Link href={`/slots/${i.slotId}`} className="hover:underline">
                {i.name}
              </Link>
            ) : (
              i.name
            )}
            {i.car && <span className="text-muted"> · {i.car}</span>}
          </li>
        ))}
      </ul>
      {s.notes && <p className="border-t border-border px-4 py-2 text-xs text-muted">{s.notes}</p>}
    </li>
  )
}

function group<T>(list: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>()
  for (const t of list) m.set(key(t), [...(m.get(key(t)) ?? []), t])
  return m
}
