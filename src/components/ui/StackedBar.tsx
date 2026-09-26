import { BUCKETS, BUCKET_LABELS, describeCounts, type Bucket, type Counts } from '@/lib/partsmap/buckets'

const FILL: Record<Bucket, string> = {
  built: 'bg-st-built',
  shipped: 'bg-st-shipped',
  bought: 'bg-st-bought',
  need: 'bg-st-need',
}

/** Built / Shipped / Bought / To buy as one bar. Counts are always also shown as text elsewhere. */
export function StackedBar({ counts, label, size = 'sm' }: { counts: Counts; label: string; size?: 'sm' | 'lg' }) {
  return (
    <div
      role="img"
      aria-label={describeCounts(label, counts)}
      className={`flex overflow-hidden bg-track ${size === 'lg' ? 'h-2 rounded-[4px]' : 'h-[5px] rounded-[3px]'}`}
    >
      {counts.total > 0 &&
        BUCKETS.map((b) => (counts[b] ? <div key={b} className={FILL[b]} style={{ width: `${(counts[b] / counts.total) * 100}%` }} /> : null))}
    </div>
  )
}

export function BucketLegend({ counts }: { counts?: Counts }) {
  return (
    <ul className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-text-2">
      {BUCKETS.map((b) => (
        <li key={b} className="flex items-center gap-1.5">
          <span aria-hidden className={`h-[9px] w-[9px] rounded-full ${FILL[b]}`} />
          {BUCKET_LABELS[b]}
          {counts && <b className="font-mono font-medium text-text">{counts[b]}</b>}
        </li>
      ))}
    </ul>
  )
}
