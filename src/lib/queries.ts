import 'server-only'
import type { CarOverviewData } from '@/components/car/CarOverview'
import type { SlotListItem } from '@/components/car/SystemParts'
import type { CarSystem } from './domain'
import { progressOf, type MapSlot, type Progress } from './partsmap/stats'
import { bucketOf, type StatusInfo } from './partsmap/buckets'
import { BAY_BY_ID, zoneOf, type BayId, type ZoneId } from './partsmap/zones'
import { requireHousehold } from './session'

// TODO: replace these hand-written row types with `npm run db:types` output
// once the local database is running.

export type CarSummary = CarOverviewData & {
  trim: string | null
  budget_cents: number
  spent_cents: number
  open_slots: number
  at_builder_count: number
  color: string | null
  total_slots: number
}

const CAR_SUMMARY_COLUMNS =
  'id, nickname, year, generation, trim, color, original_engine_variant, target_engine_variant, budget_cents, spent_cents, open_slots, total_slots, at_builder_count'

export async function listCars() {
  const { supabase } = await requireHousehold()
  const [cars, slots] = await Promise.all([
    supabase.from('car_summary').select(CAR_SUMMARY_COLUMNS).order('created_at'),
    supabase.from('part_slots').select('car_id, zone, system, build_status'),
  ])
  if (cars.error) throw cars.error
  if (slots.error) throw slots.error
  // Zone progress for the garage-card thumbnails.
  type ZoneSlot = Pick<MapSlot, 'zone' | 'system' | 'build_status'> & { car_id: string }
  const zoneSlots = new Map<string, Map<ZoneId, ZoneSlot[]>>()
  for (const s of slots.data as ZoneSlot[]) {
    const byZone = zoneSlots.get(s.car_id) ?? new Map<ZoneId, ZoneSlot[]>()
    const z = zoneOf(s)
    byZone.set(z, [...(byZone.get(z) ?? []), s])
    zoneSlots.set(s.car_id, byZone)
  }
  return (cars.data as CarSummary[]).map((car) => ({
    car,
    zones: Object.fromEntries([...(zoneSlots.get(car.id) ?? [])].map(([z, list]) => [z, progressOf(list)])) as Partial<Record<ZoneId, Progress>>,
  }))
}

/** Every slot on a car, for the parts map. */
export async function getCarSlots(carId: string) {
  const { supabase } = await requireHousehold()
  const { data, error } = await supabase
    .from('slot_progress')
    .select('id, name, system, zone, bay, build_status, status_id, required_qty, have_qty, needs_review')
    .eq('car_id', carId)
    .order('sort_order')
  if (error) throw error
  return data as MapSlot[]
}

export async function getCar(carId: string) {
  const { supabase } = await requireHousehold()
  const car = await supabase.from('car_summary').select(CAR_SUMMARY_COLUMNS).eq('id', carId).maybeSingle()
  if (car.error) throw car.error
  if (!car.data) return null
  return { car: car.data as CarSummary }
}

type ListRow = SlotListItem & { status_id: string | null; zone: string | null; bay: string | null; system: CarSystem }

async function listSlots(carId: string, filter: { system?: CarSystem }) {
  const { supabase } = await requireHousehold()
  let q = supabase
    .from('slot_progress')
    .select('id, system, zone, bay, subsystem, name, required_qty, have_qty, build_status, status_id, destination, needs_review, fitment_notes, fits_years')
    .eq('car_id', carId)
    .order('sort_order')
  if (filter.system) q = q.eq('system', filter.system)
  const [slots, statuses] = await Promise.all([q, supabase.from('part_statuses').select('id, label, category, at_builder')])
  if (slots.error) throw slots.error
  const byId = new Map((statuses.data ?? []).map((s) => [s.id as string, s as { id: string; label: string } & StatusInfo]))
  return (slots.data as ListRow[]).map((s) => ({
    ...s,
    status_label: s.status_id ? (byId.get(s.status_id)?.label ?? null) : null,
    bucket: bucketOf(s, byId),
  }))
}

export async function getSystemSlots(carId: string, system: CarSystem) {
  return listSlots(carId, { system })
}

/** A zone's parts. The engine zone is long, so its parts are grouped by bay component. */
export async function getZoneSlots(carId: string, zone: ZoneId) {
  const all = await listSlots(carId, {})
  return all
    .filter((s) => zoneOf(s) === zone)
    .map((s) => ({ ...s, subsystem: zone === 'engine' && s.bay ? (BAY_BY_ID.get(s.bay as BayId)?.name ?? s.subsystem) : s.subsystem }))
}
