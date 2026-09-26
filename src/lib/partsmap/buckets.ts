import type { BuildStatus } from '../domain'

/**
 * The four progress buckets on the car page. Every household status falls into
 * one: its category decides built / bought / to buy, and the at-builder flag
 * separates "shipped to builder" from "bought".
 */
export const BUCKETS = ['built', 'shipped', 'bought', 'need'] as const
export type Bucket = (typeof BUCKETS)[number]

export const BUCKET_LABELS: Record<Bucket, string> = {
  built: 'Built / in car',
  shipped: 'Shipped to builder',
  bought: 'Bought',
  need: 'Need to buy',
}

export type StatusInfo = { category: BuildStatus; at_builder: boolean }
export type Counts = Record<Bucket, number> & { total: number; review: number }

export function bucketOf(slot: { build_status: BuildStatus; status_id: string | null }, statuses: Map<string, StatusInfo>): Bucket {
  if (slot.build_status === 'installed') return 'built'
  if (slot.build_status === 'have') return slot.status_id && statuses.get(slot.status_id)?.at_builder ? 'shipped' : 'bought'
  return 'need'
}

export function countBuckets(slots: { build_status: BuildStatus; status_id: string | null; needs_review?: boolean }[], statuses: Map<string, StatusInfo>): Counts {
  const c: Counts = { built: 0, shipped: 0, bought: 0, need: 0, total: slots.length, review: 0 }
  for (const s of slots) {
    c[bucketOf(s, statuses)]++
    if (s.needs_review) c.review++
  }
  return c
}

/** Same as countBuckets for parts that already know their bucket. */
export function countByBucket(items: { bucket: Bucket; needs_review?: boolean }[]): Counts {
  const c: Counts = { built: 0, shipped: 0, bought: 0, need: 0, total: items.length, review: 0 }
  for (const i of items) {
    c[i.bucket]++
    if (i.needs_review) c.review++
  }
  return c
}

/** "Engine: 1 built, 3 shipped, 5 bought, 15 to buy" for stacked-bar labels. */
export function describeCounts(name: string, c: Counts) {
  return `${name}: ${c.built} built, ${c.shipped} shipped, ${c.bought} bought, ${c.need} to buy`
}
