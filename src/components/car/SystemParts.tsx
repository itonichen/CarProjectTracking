import Link from 'next/link'
import { Car as CarIcon, ChevronRight, TriangleAlert, Wrench } from 'lucide-react'
import { formatYearRange, parseYearRange, type BuildStatus, type Destination } from '@/lib/domain'

export type SlotListItem = {
  id: string
  subsystem: string | null
  name: string
  required_qty: number
  have_qty: number
  build_status: BuildStatus
  status_label?: string | null
  destination: Destination
  needs_review: boolean
  fitment_notes: string | null
  fits_years: string | null
}

const STATUS_STYLE: Record<BuildStatus, string> = {
  needed: 'bg-surface-2 text-muted',
  sourcing: 'bg-warn-soft text-warn',
  have: 'bg-accent-soft text-accent-strong',
  installed: 'bg-ok-soft text-ok',
}

const STATUS_LABEL: Record<BuildStatus, string> = {
  needed: 'Needed',
  sourcing: 'Sourcing',
  have: 'Have',
  installed: 'Installed',
}

export function StatusPill({ status, label }: { status: BuildStatus; label?: string | null }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{label ?? STATUS_LABEL[status]}</span>
}

export function DestinationTag({ destination }: { destination: Destination }) {
  const Icon = destination === 'builder' ? Wrench : CarIcon
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <Icon aria-hidden size={12} />
      {destination === 'builder' ? 'Builder' : 'Car'}
    </span>
  )
}

/**
 * Exploded view: subsystems hang off a vertical spine like an exploded
 * parts drawing, each listing its slots with have/required quantities.
 */
export function SystemParts({ slots, slotHref }: { slots: SlotListItem[]; slotHref: (id: string) => string }) {
  const groups = new Map<string, SlotListItem[]>()
  for (const s of slots) {
    const key = s.subsystem ?? 'General'
    groups.set(key, [...(groups.get(key) ?? []), s])
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-dashed border-border pl-4 md:pl-6">
      {[...groups].map(([subsystem, items]) => {
        const done = items.filter((s) => s.build_status === 'have' || s.build_status === 'installed').length
        return (
          <li key={subsystem} className="relative">
            <span aria-hidden className="absolute top-3 -left-[1.4rem] h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent md:-left-[1.9rem]" />
            <section className="overflow-hidden rounded-xl border border-border bg-surface">
              <header className="flex items-baseline justify-between border-b border-border bg-surface-2/60 px-4 py-2">
                <h3 className="text-sm font-semibold">{subsystem}</h3>
                <span className="tabular text-xs text-muted">
                  {done}/{items.length} slots
                </span>
              </header>
              <ul className="divide-y divide-border">
                {items.map((s) => {
                  const qtyDone = Math.min(s.have_qty, s.required_qty)
                  const range = parseYearRange(s.fits_years)
                  return (
                    <li key={s.id}>
                      <Link href={slotHref(s.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                        <QtyMeter have={qtyDone} required={s.required_qty} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate font-medium">{s.name}</span>
                            {s.needs_review && <TriangleAlert aria-label="Needs review" size={14} className="shrink-0 text-warn" />}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <StatusPill status={s.build_status} label={s.status_label} />
                            <DestinationTag destination={s.destination} />
                            {range && <span className="text-xs text-muted">{formatYearRange(range)}</span>}
                          </div>
                          {s.fitment_notes && <p className="mt-1 line-clamp-2 text-xs text-muted">{s.fitment_notes}</p>}
                        </div>
                        <ChevronRight aria-hidden size={16} className="shrink-0 text-muted" />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          </li>
        )
      })}
    </ol>
  )
}

function QtyMeter({ have, required }: { have: number; required: number }) {
  const full = have >= required
  return (
    <div
      className={`tabular flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg text-center leading-none ${
        full ? 'bg-ok-soft text-ok' : have > 0 ? 'bg-accent-soft text-accent-strong' : 'bg-surface-2 text-muted'
      }`}
      aria-label={`${have} of ${required} on hand`}
    >
      <span className="text-sm font-semibold">
        {have}/{required}
      </span>
      <span className="mt-0.5 text-[10px]">qty</span>
    </div>
  )
}
