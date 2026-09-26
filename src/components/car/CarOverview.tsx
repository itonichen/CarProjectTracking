import Link from 'next/link'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import type { PartStatus } from '@/components/partsmap/actions'
import { PartsMap } from '@/components/partsmap/PartsMap'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { SYSTEMS, SYSTEM_LABELS, type CarSystem, type EngineVariant, type Generation } from '@/lib/domain'
import type { MapSlot } from '@/lib/partsmap/stats'

export type CarOverviewData = {
  id: string
  nickname: string
  year: number
  generation: Generation
  trim: string | null
  original_engine_variant: EngineVariant
  target_engine_variant: EngineVariant
  budget_cents: number
  spent_cents: number
  open_slots: number
  at_builder_count: number
}

export type SystemRow = { system: CarSystem; done: number; total: number; open: number; review: number }

export function CarOverview({
  car,
  systems,
  slots,
  statuses,
  systemHref,
}: {
  car: CarOverviewData
  systems: SystemRow[]
  slots: MapSlot[]
  statuses: PartStatus[]
  systemHref: (system: CarSystem) => string
}) {
  const showConversion = car.original_engine_variant !== car.target_engine_variant
  const progress = Object.fromEntries(systems.map((s) => [s.system, s])) as Record<CarSystem, SystemRow>
  const ordered = SYSTEMS.filter((s) => s !== 'conversion' || showConversion).map(
    (system) => progress[system] ?? { system, done: 0, total: 0, open: 0, review: 0 },
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />
        {car.trim && <span className="text-xs text-muted">{car.trim}</span>}
      </div>

      <section aria-labelledby="map-h">
        <h2 id="map-h" className="sr-only">
          Parts map
        </h2>
        <PartsMap slots={slots} statuses={statuses} />
      </section>

      <section aria-labelledby="systems-h">
        <h2 id="systems-h" className="mb-2 text-sm font-semibold text-muted">
          By system
        </h2>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {ordered.map((s) => {
            const p = s.total ? s.done / s.total : 0
            return (
              <li key={s.system}>
                <Link href={systemHref(s.system)} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {SYSTEM_LABELS[s.system]}
                        {s.review > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-normal text-warn">
                            <TriangleAlert aria-hidden size={12} />
                            {s.review} to review
                          </span>
                        )}
                      </span>
                      <span className="tabular shrink-0 text-sm text-muted">
                        {s.total ? `${s.done}/${s.total}` : 'No slots'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <div className={`h-full rounded-full ${p >= 1 ? 'bg-ok' : 'bg-accent'}`} style={{ width: `${p * 100}%` }} />
                    </div>
                  </div>
                  <ChevronRight aria-hidden size={16} className="shrink-0 text-muted" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
