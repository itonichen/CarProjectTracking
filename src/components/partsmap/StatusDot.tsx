import type { Bucket } from '@/lib/partsmap/buckets'

const FILL: Record<Bucket, string> = {
  built: 'var(--st-built)',
  shipped: 'var(--st-shipped)',
  bought: 'var(--st-bought)',
  need: 'var(--accent)',
}

/** A status in its bucket colour: built ink, shipped grey, bought light, to buy red. */
export function StatusDot({ bucket, size = 10 }: { bucket: Bucket; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: FILL[bucket] }} />
}
