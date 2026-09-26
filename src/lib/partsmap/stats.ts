import type { BuildStatus, CarSystem } from '../domain'

export type MapSlot = {
  id: string
  name: string
  system: CarSystem
  zone: string | null
  bay: string | null
  build_status: BuildStatus
  status_id: string | null
  required_qty: number
  have_qty: number
  needs_review: boolean
}

export type Progress = { done: number; total: number; open: number }

/** Parts with status have or installed out of all parts, like the design's "2/4". */
export function progressOf(slots: { build_status: BuildStatus }[]): Progress {
  const done = slots.filter((s) => s.build_status === 'have' || s.build_status === 'installed').length
  return { done, total: slots.length, open: slots.length - done }
}
