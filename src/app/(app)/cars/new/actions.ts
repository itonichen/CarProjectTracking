'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { newCarSchema } from '@/lib/schemas/car'
import { requireHousehold } from '@/lib/session'
import { buildSlotRows } from '@/lib/templates.apply'

export type NewCarState = { errors?: Record<string, string[] | undefined>; message?: string }

export async function createCar(_prev: NewCarState, formData: FormData): Promise<NewCarState> {
  const parsed = newCarSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  const { supabase, householdId } = await requireHousehold()
  const car = { ...parsed.data, household_id: householdId }
  const { slots } = buildSlotRows(car)
  const { data: carId, error } = await supabase.rpc('create_car_with_slots', { p_car: car, p_slots: slots })
  if (error) return { message: error.message }
  redirect(`/cars/${carId}`)
}
