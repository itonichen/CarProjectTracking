import { notFound } from 'next/navigation'
import { CarOverview } from '@/components/car/CarOverview'
import { MiniPartsMap } from '@/components/partsmap/MiniPartsMap'
import { BUILD_STATUSES } from '@/lib/domain'
import { progressOf, type MapSlot } from '@/lib/partsmap/stats'
import { ZONE_IDS, zoneOf } from '@/lib/partsmap/zones'
import { buildSlotRows } from '@/lib/templates.apply'

// Dev-only preview of the car page with fixture data (statuses rotate so every
// bucket shows up). Row links point at a car that doesn't exist. 404 in production.

export default function CarPreview() {
  if (process.env.NODE_ENV === 'production') notFound()

  const statuses = [
    { id: 's1', category: 'needed' as const, at_builder: false },
    { id: 's2', category: 'have' as const, at_builder: false },
    { id: 's3', category: 'have' as const, at_builder: true },
    { id: 's4', category: 'installed' as const, at_builder: false },
  ]
  const car = { generation: 'gen2_1994_96', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' } as const
  const slots: MapSlot[] = buildSlotRows(car).slots.map((s, i) => {
    const k = (i * 7) % 4
    return {
      id: `preview-${i}`,
      name: s.name,
      system: s.system,
      zone: s.zone,
      bay: s.bay,
      build_status: BUILD_STATUSES[[0, 2, 2, 3][k]],
      status_id: statuses[k].id,
      required_qty: s.required_qty,
      have_qty: 0,
      needs_review: s.needs_review,
    }
  })
  const zones = Object.fromEntries(ZONE_IDS.map((z) => [z, progressOf(slots.filter((s) => zoneOf(s) === z))]))

  return (
    <div className="min-h-dvh">
      <CarOverview car={{ id: 'preview', nickname: "Dad's 3000 GT", year: 1994, ...car }} slots={slots} statuses={statuses} initialGroup="zone" />
      <div className="mx-auto max-w-[1120px] px-4 pb-10 md:px-11">
        <h2 className="mb-2 text-sm font-semibold text-muted">Garage card thumbnail</h2>
        <div className="max-w-sm rounded-2xl border border-border bg-surface p-4">
          <MiniPartsMap progress={zones} label="Preview" />
        </div>
      </div>
    </div>
  )
}
