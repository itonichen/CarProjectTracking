import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CarExplorer } from '@/components/partsmap/CarExplorer'
import { CarPageFrame } from './CarPageFrame'
import { BucketLegend, StackedBar } from '@/components/ui/StackedBar'
import { ENGINE_LABELS, GENERATION_INFO, SYSTEM_LABELS, SYSTEMS, type EngineVariant, type Generation } from '@/lib/domain'
import { countBuckets, type StatusInfo } from '@/lib/partsmap/buckets'
import type { Group } from '@/lib/partsmap/breakdown'
import type { MapSlot } from '@/lib/partsmap/stats'
import { zoneOf } from '@/lib/partsmap/zones'

export type CarOverviewData = {
  id: string
  nickname: string
  year: number
  generation: Generation
  original_engine_variant: EngineVariant
  target_engine_variant: EngineVariant
}

type Action = { title: string; sub: string; cta: string; href: string; tone: 'warn' | 'accent' | 'ink' }

/** Car detail, layout 1c: header with overall progress, next actions, the car, then the breakdown. */
export function CarOverview({
  car,
  slots,
  statuses,
  initialGroup,
  backHref = '/garage',
}: {
  car: CarOverviewData
  slots: MapSlot[]
  statuses: (StatusInfo & { id: string; label?: string })[]
  initialGroup: Group
  backHref?: string
}) {
  const statusMap = new Map(statuses.map((s) => [s.id, s]))
  const total = countBuckets(slots, statusMap)
  const pct = total.total ? Math.round((total.built / total.total) * 100) : 0
  const converting = car.original_engine_variant !== car.target_engine_variant

  const review = slots.filter((s) => s.needs_review)
  const reviewSystems = SYSTEMS.filter((sys) => review.some((s) => s.system === sys))
  const needZones = new Set(slots.filter((s) => s.build_status === 'needed' || s.build_status === 'sourcing').map((s) => zoneOf(s))).size
  const actions: Action[] = [
    review.length > 0 && {
      title: `${review.length} ${review.length === 1 ? 'part' : 'parts'} to review`,
      sub: reviewSystems.map((s) => SYSTEM_LABELS[s]).join(', '),
      cta: 'Review',
      href: `/cars/${car.id}/systems/${reviewSystems[0]}`,
      tone: 'warn' as const,
    },
    total.need > 0 && {
      title: `${total.need} ${total.need === 1 ? 'part' : 'parts'} to buy`,
      sub: `Across ${needZones} ${needZones === 1 ? 'zone' : 'zones'}`,
      cta: 'Buy list',
      href: `/buy?car=${car.id}`,
      tone: 'accent' as const,
    },
    total.shipped > 0 && { title: `${total.shipped} at the builder`, sub: 'Shipped, not installed', cta: 'Track', href: '/shipments', tone: 'ink' as const },
  ].filter(Boolean) as Action[]

  return (
    <CarPageFrame>
      <header className="flex flex-col gap-3.5">
        <Link href={backHref} className="-my-2.5 inline-flex min-h-11 w-fit items-center gap-0.5 text-sm text-muted hover:text-text md:my-0 md:min-h-6">
          <ChevronLeft aria-hidden size={16} />
          Garage
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
          <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[34px]">{car.nickname}</h1>
          <div className="flex flex-wrap gap-1.5 text-[13px]">
            <span className="rounded-md bg-chip px-2 py-1">
              {car.year} · {GENERATION_INFO[car.generation].short}
            </span>
            <span className="rounded-md bg-chip px-2 py-1">
              {ENGINE_LABELS[car.original_engine_variant]}
              {converting && (
                <>
                  {' → '}
                  <b className="font-semibold text-accent">{ENGINE_LABELS[car.target_engine_variant]}</b>
                </>
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="text-[15px] font-semibold">
              {total.built} of {total.total} parts in the car
            </span>
            <span className="text-sm text-muted">{pct}%</span>
          </p>
          <StackedBar counts={total} label="Whole car" size="lg" />
          <BucketLegend counts={total} />
        </div>
      </header>

      {actions.length > 0 && (
        <nav aria-label="Next steps" className="flex flex-wrap gap-2.5">
          {actions.map((a) => (
            <Link
              key={a.cta}
              href={a.href}
              className="flex min-h-16 flex-[1_1_220px] items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 hover:border-faint"
            >
              <span className="flex flex-col gap-[3px]">
                <span className={`text-[15px] font-semibold ${a.tone === 'warn' ? 'text-warn' : a.tone === 'accent' ? 'text-accent' : 'text-text'}`}>{a.title}</span>
                <span className="text-[13px] text-muted">{a.sub}</span>
              </span>
              <span className="inline-flex items-center text-[13px] font-medium whitespace-nowrap">
                {a.cta}
                <ChevronRight aria-hidden size={14} />
              </span>
            </Link>
          ))}
        </nav>
      )}

      <CarExplorer carId={car.id} slots={slots} statuses={statuses} initialGroup={initialGroup} />
    </CarPageFrame>
  )
}
