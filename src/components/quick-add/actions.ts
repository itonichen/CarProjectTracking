'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { BuildStatus, CarSystem, EngineVariant, Generation } from '@/lib/domain'
import { quickAddSchema } from '@/lib/schemas/acquisition'
import { requireHousehold } from '@/lib/session'

export type QuickAddCar = {
  id: string
  nickname: string
  year: number
  generation: Generation
  original_engine_variant: EngineVariant
  target_engine_variant: EngineVariant
}

export type QuickAddSlot = {
  id: string
  car_id: string
  system: CarSystem
  subsystem: string | null
  name: string
  required_qty: number
  have_qty: number
  build_status: BuildStatus
  fits_years: string | null
}

export async function getQuickAddOptions() {
  const { supabase, householdId } = await requireHousehold()
  const [cars, slots] = await Promise.all([
    supabase.from('cars').select('id, nickname, year, generation, original_engine_variant, target_engine_variant').order('created_at'),
    supabase.from('slot_progress').select('id, car_id, system, subsystem, name, required_qty, have_qty, build_status, fits_years').order('sort_order'),
  ])
  if (cars.error) throw cars.error
  if (slots.error) throw slots.error
  return { householdId, cars: cars.data as QuickAddCar[], slots: slots.data as QuickAddSlot[] }
}

export type QuickAddState = { errors?: Record<string, string[] | undefined>; message?: string; savedId?: string }

export async function quickAdd(_prev: QuickAddState, formData: FormData): Promise<QuickAddState> {
  const parsed = quickAddSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const { supabase, householdId } = await requireHousehold()
  const { price, shipping, payment_method, photo_path, ...a } = parsed.data

  const { data, error } = await supabase.rpc('quick_add_acquisition', {
    p_acq: { ...a, household_id: householdId, price_cents: price, shipping_cents: shipping },
    p_payment_method: payment_method,
    p_photo_path: photo_path,
  })
  if (error) return { message: error.message }

  revalidatePath('/', 'layout')
  return { savedId: data as string }
}
