import 'server-only'
import type { SystemRow, CarOverviewData } from '@/components/car/CarOverview'
import type { SlotListItem } from '@/components/car/SystemParts'
import type { CarSystem } from './domain'
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
  const [cars, progress] = await Promise.all([
    supabase.from('car_summary').select(CAR_SUMMARY_COLUMNS).order('created_at'),
    supabase.from('car_system_progress').select('car_id, system, total_slots, done_slots, open_slots, review_slots'),
  ])
  if (cars.error) throw cars.error
  if (progress.error) throw progress.error
  const bySystem = new Map<string, SystemRow[]>()
  for (const r of progress.data as ProgressRow[]) bySystem.set(r.car_id, [...(bySystem.get(r.car_id) ?? []), toSystemRow(r)])
  return (cars.data as CarSummary[]).map((car) => ({ car, systems: bySystem.get(car.id) ?? [] }))
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
  const { data, error } = await supabase
    .from('slot_progress')
    .select('id, subsystem, name, required_qty, have_qty, build_status, destination, needs_review, fitment_notes, fits_years')
    .eq('car_id', carId)
    .eq('system', system)
    .order('sort_order')
  if (error) throw error
  return data as SlotListItem[]
}
