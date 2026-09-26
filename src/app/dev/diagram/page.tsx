import { notFound } from 'next/navigation'
import { CarOverview, type SystemRow } from '@/components/car/CarOverview'
import { CarDiagram } from '@/components/diagram/CarDiagram'
import { PageHeader } from '@/components/ui/PageHeader'
import { buildSlotRows } from '@/lib/templates.apply'
import { SYSTEMS } from '@/lib/domain'

// Dev-only preview of the diagram with fixture data, so outlines can be
// tuned without a database. Returns 404 in production.

const LEVELS = [0.75, 0.55, 0.3, 0.6, 0.5, 0.25, 0.8, 0.5, 1, 0.2]

export default function DiagramPreview() {
  if (process.env.NODE_ENV === 'production') notFound()

  const car = { generation: 'gen2_1994_96', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' } as const
  const { slots } = buildSlotRows(car)
  const systems: SystemRow[] = SYSTEMS.map((system, i) => {
    const total = slots.filter((s) => s.system === system).length
    const done = Math.round(total * LEVELS[i])
    return { system, total, done, open: total - done, review: system === 'drivetrain' ? 1 : 0 }
  })

  return (
    <div className="min-h-dvh">
      <PageHeader title="Red '94" subtitle="Diagram preview (fixture data)" back={{ href: '/garage', label: 'Garage' }} />
      <div className="px-4 py-4 md:px-8">
        <CarOverview
          car={{ id: 'preview', nickname: "Red '94", year: 1994, trim: 'SL', budget_cents: 1_800_000, spent_cents: 1_240_000, open_slots: 38, at_builder_count: 3, ...car }}
          systems={systems}
          systemHref={(s) => `/dev/diagram/${s}`}
        />
        <h2 className="mt-8 mb-2 text-sm font-semibold text-muted">Mini (garage card)</h2>
        <div className="grid grid-cols-2 gap-3">
          <CarDiagram id="mini-a" mini generation="gen2_1994_96" showConversion progress={Object.fromEntries(systems.map((s) => [s.system, s]))} />
          <CarDiagram id="mini-b" mini generation="gen2_1994_96" showConversion={false} progress={{}} />
        </div>
      </div>
    </div>
  )
}
