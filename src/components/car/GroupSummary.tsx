import { BucketLegend, StackedBar } from '@/components/ui/StackedBar'
import type { Counts } from '@/lib/partsmap/buckets'

/** Built / shipped / bought / to buy for one zone or system. */
export function GroupSummary({ name, counts, blurb }: { name: string; counts: Counts; blurb?: string }) {
  return (
    <section aria-label={`${name} progress`} className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-4">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="text-[15px] font-semibold">
          {counts.built} of {counts.total} built
        </span>
        {counts.review > 0 && <span className="rounded-[5px] bg-warn-soft px-1.5 py-0.5 text-xs text-warn">{counts.review} to review</span>}
      </p>
      <StackedBar counts={counts} label={name} size="lg" />
      <BucketLegend counts={counts} />
      {blurb && <p className="text-[13px] text-muted">{blurb}</p>}
    </section>
  )
}
