import Link from 'next/link'
import { ChevronRight, TriangleAlert } from 'lucide-react'
import { CarDiagram, type SystemProgress } from '@/components/diagram/CarDiagram'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { SYSTEMS, SYSTEM_LABELS, type CarSystem, type EngineVariant, type Generation } from '@/lib/domain'
import { formatCents } from '@/lib/money'

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

export type SystemRow = SystemProgress & { system: CarSystem; open: number; review: number }

export function CarOverview({
  car,
  systems,
  systemHref,
}: {
  car: CarOverviewData
  systems: SystemRow[]
  systemHref: (system: CarSystem) => string
}) {
  const showConversion = car.original_engine_variant !== car.target_engine_variant
  const progress = Object.fromEntries(systems.map((s) => [s.system, s])) as Record<CarSystem, SystemRow>
  const ordered = SYSTEMS.filter((s) => s !== 'conversion' || showConversion).map(
    (system) => progress[system] ?? { system, done: 0, total: 0, open: 0, review: 0 },
  )
  const overBudget = car.budget_cents > 0 && car.spent_cents > car.budget_cents
  const spentPct = car.budget_cents > 0 ? Math.min(1, car.spent_cents / car.budget_cents) : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />
        {car.trim && <span className="text-xs text-muted">{car.trim}</span>}
      </div>

      <section aria-labelledby="diagram-h" className="-mx-4 bg-surface px-2 py-4 md:mx-0 md:rounded-2xl md:border md:border-border md:px-6">
        <h2 id="diagram-h" className="sr-only">
          Progress by system
        </h2>
        <CarDiagram id={`car-${car.id}`} generation={car.generation} progress={progress} showConversion={showConversion} hrefFor={systemHref} className="mx-auto block w-full max-w-3xl" />
        <p className="mt-1 text-center text-xs text-muted">Tap a zone to see its parts. Counts are slots you have or have installed.</p>
      </section>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Spent" value={formatCents(car.spent_cents, { whole: true })} sub={car.budget_cents ? `of ${formatCents(car.budget_cents, { whole: true })}` : 'no budget'} tone={overBudget ? 'warn' : undefined} bar={spentPct} />
        <Stat label="Still needed" value={String(car.open_slots)} sub="slots" />
        <Stat label="At builder" value={String(car.at_builder_count)} sub="parts" />
      </dl>

      <section aria-labelledby="systems-h">
        <h2 id="systems-h" className="mb-2 text-sm font-semibold text-muted">
          Systems
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

function Stat({ label, value, sub, tone, bar }: { label: string; value: string; sub: string; tone?: 'warn'; bar?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-2 py-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`tabular mt-0.5 text-lg font-semibold ${tone === 'warn' ? 'text-warn' : ''}`}>{value}</dd>
      <dd className="text-xs text-muted">{sub}</dd>
      {bar !== undefined && (
        <dd aria-hidden className="mx-auto mt-1.5 h-1 w-3/4 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${tone === 'warn' ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${bar * 100}%` }} />
        </dd>
      )}
    </div>
  )
}
