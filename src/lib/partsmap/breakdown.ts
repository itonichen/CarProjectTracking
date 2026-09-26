import { SYSTEMS, SYSTEM_LABELS, type CarSystem } from '../domain'
import { countBuckets, type Counts, type StatusInfo } from './buckets'
import type { MapSlot } from './stats'
import { ZONES, zoneOf, type ZoneId } from './zones'

export type Group = 'zone' | 'system'
export const GROUP_COOKIE = 'breakdown-group'
export const parseGroup = (v: string | undefined): Group => (v === 'system' ? 'system' : 'zone')

export type BreakdownRow = { id: string; name: string; counts: Counts; flag?: string }

/** Same order the design lists zones in: front of the car to the back. */
export const ZONE_ORDER: ZoneId[] = ['front-end', 'lighting', 'engine', 'wheel-front', 'cabin', 'body-side', 'side-vent', 'drivetrain', 'wheel-rear', 'hatch', 'rear-end']

export function breakdown(slots: MapSlot[], statuses: Map<string, StatusInfo>, group: Group): BreakdownRow[] {
  const rows: BreakdownRow[] =
    group === 'zone'
      ? ZONE_ORDER.map((id) => ({
          id,
          name: ZONES.find((z) => z.id === id)!.name,
          counts: countBuckets(
            slots.filter((s) => zoneOf(s) === id),
            statuses,
          ),
        }))
      : SYSTEMS.map((id: CarSystem) => ({
          id,
          name: SYSTEM_LABELS[id],
          counts: countBuckets(
            slots.filter((s) => s.system === id),
            statuses,
          ),
        }))
  return rows.filter((r) => r.counts.total > 0).map((r) => (r.counts.review ? { ...r, flag: `${r.counts.review} to review` } : r))
}
