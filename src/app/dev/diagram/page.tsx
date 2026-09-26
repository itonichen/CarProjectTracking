import { notFound } from 'next/navigation'
import { CarOverview, type SystemRow } from '@/components/car/CarOverview'
import { MiniPartsMap } from '@/components/partsmap/MiniPartsMap'
import { PageHeader } from '@/components/ui/PageHeader'
import type { PartStatus } from '@/components/partsmap/actions'
import { BUILD_STATUSES, SYSTEMS } from '@/lib/domain'
import { progressOf, type MapSlot } from '@/lib/partsmap/stats'
import { ZONE_IDS, zoneOf } from '@/lib/partsmap/zones'
import { buildSlotRows } from '@/lib/templates.apply'

// Dev-only preview of the parts map with fixture data (statuses rotate so every
// state shows up). Part details don't load here. Returns 404 in production.

export default function PartsMapPreview() {
  if (process.env.NODE_ENV === 'production') notFound()

  const statuses: PartStatus[] = [
    { id: 's1', label: 'Need to Buy', category: 'needed', sort_order: 10 },
    { id: 's2', label: 'Bought', category: 'have', sort_order: 20 },
    { id: 's3', label: 'Shipped to Builder', category: 'have', sort_order: 30 },
    { id: 's4', label: 'Built / In Car', category: 'installed', sort_order: 40 },
  ]
  const car = { generation: 'gen2_1994_96', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' } as const
  const slots: MapSlot[] = buildSlotRows(car).slots.map((s, i) => ({
    id: `preview-${i}`,
    name: s.name,
    system: s.system,
    zone: s.zone,
    bay: s.bay,
    build_status: BUILD_STATUSES[(i * 7) % 4],
    status_id: null,
    required_qty: s.required_qty,
    have_qty: 0,
    needs_review: s.needs_review,
  }))
  const systems: SystemRow[] = SYSTEMS.map((system) => {
    const p = progressOf(slots.filter((s) => s.system === system))
    return { system, ...p, review: slots.filter((s) => s.system === system && s.needs_review).length }
  })
  const zones = Object.fromEntries(ZONE_IDS.map((z) => [z, progressOf(slots.filter((s) => zoneOf(s) === z))]))

  return (
    <div className="min-h-dvh">
      <PageHeader title="Dad's 3000GT" subtitle="Parts map preview (fixture data)" back={{ href: '/garage', label: 'Garage' }} />
      <div className="mx-auto max-w-6xl px-4 py-4 md:px-8">
        <CarOverview
          car={{ id: 'preview', nickname: "Dad's 3000GT", year: 1994, trim: null, budget_cents: 1_800_000, spent_cents: 1_240_000, open_slots: 38, at_builder_count: 3, ...car }}
          systems={systems}
          slots={slots}
          statuses={statuses}
          systemHref={(s) => `/dev/diagram/${s}`}
        />
        <h2 className="mt-8 mb-2 text-sm font-semibold text-muted">Garage card thumbnail</h2>
        <div className="max-w-sm rounded-2xl border border-border bg-surface p-4">
          <MiniPartsMap progress={zones} label="Preview" />
        </div>
      </div>
    </div>
  )
}
