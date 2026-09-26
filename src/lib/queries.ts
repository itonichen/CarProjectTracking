import 'server-only'
import type { SystemRow, CarOverviewData } from '@/components/car/CarOverview'
import type { SlotListItem } from '@/components/car/SystemParts'
import type { CarSystem } from './domain'
import { progressOf, type MapSlot, type Progress } from './partsmap/stats'
import { zoneOf, type ZoneId } from './partsmap/zones'
import { requireHousehold } from './session'

// TODO: replace these hand-written row types with `npm run db:types` output
// once the local database is running.

export type CarSummary = CarOverviewData & {
  color: string | null
  total_slots: number
}

const CAR_SUMMARY_COLUMNS =
  'id, nickname, year, generation, trim, color, original_engine_variant, target_engine_variant, budget_cents, spent_cents, open_slots, total_slots, at_builder_count'

type ProgressRow = { car_id: string; system: CarSystem; total_slots: number; done_slots: number; open_slots: number; review_slots: number }

const toSystemRow = (r: ProgressRow): SystemRow => ({ system: r.system, total: r.total_slots, done: r.done_slots, open: r.open_slots, review: r.review_slots })

export async function listCars() {
  const { supabase } = await requireHousehold()
  const [cars, progress, slots] = await Promise.all([
    supabase.from('car_summary').select(CAR_SUMMARY_COLUMNS).order('created_at'),
    supabase.from('car_system_progress').select('car_id, system, total_slots, done_slots, open_slots, review_slots'),
    supabase.from('part_slots').select('car_id, zone, system, build_status'),
  ])
  if (cars.error) throw cars.error
  if (progress.error) throw progress.error
  if (slots.error) throw slots.error
  const bySystem = new Map<string, SystemRow[]>()
  for (const r of progress.data as ProgressRow[]) bySystem.set(r.car_id, [...(bySystem.get(r.car_id) ?? []), toSystemRow(r)])
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
    systems: bySystem.get(car.id) ?? [],
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
  const [car, progress] = await Promise.all([
    supabase.from('car_summary').select(CAR_SUMMARY_COLUMNS).eq('id', carId).maybeSingle(),
    supabase.from('car_system_progress').select('car_id, system, total_slots, done_slots, open_slots, review_slots').eq('car_id', carId),
  ])
  if (car.error) throw car.error
  if (progress.error) throw progress.error
  if (!car.data) return null
  return { car: car.data as CarSummary, systems: (progress.data as ProgressRow[]).map(toSystemRow) }
}

export async function getSystemSlots(carId: string, system: CarSystem) {
  const { supabase } = await requireHousehold()
  const [slots, statuses] = await Promise.all([
    supabase
      .from('slot_progress')
      .select('id, subsystem, name, required_qty, have_qty, build_status, status_id, destination, needs_review, fitment_notes, fits_years')
      .eq('car_id', carId)
      .eq('system', system)
      .order('sort_order'),
    supabase.from('part_statuses').select('id, label'),
  ])
  if (slots.error) throw slots.error
  const label = new Map((statuses.data ?? []).map((s) => [s.id as string, s.label as string]))
  return (slots.data as (SlotListItem & { status_id: string | null })[]).map((s) => ({ ...s, status_label: s.status_id ? label.get(s.status_id) : null }))
}
