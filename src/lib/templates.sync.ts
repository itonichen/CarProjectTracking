import type { SlotRow } from './templates.apply'

type Existing = { template_key: string | null; sort_order: number }

/**
 * Template slots a car doesn't have yet, with sort orders that place each one
 * right after the template slot before it. Existing slots are never changed,
 * so edits and progress on a car are safe. Assumes existing template slots
 * are spaced apart (create_car_with_slots uses steps of 10).
 */
export function missingSlots(plan: SlotRow[], existing: Existing[]): SlotRow[] {
  const have = new Map(existing.filter((e) => e.template_key).map((e) => [e.template_key!, e.sort_order]))
  const missing: SlotRow[] = []
  let last = 0
  for (const row of plan) {
    const current = have.get(row.template_key)
    if (current !== undefined) {
      last = current
    } else {
      last += 1
      missing.push({ ...row, sort_order: last })
    }
  }
  return missing
}
