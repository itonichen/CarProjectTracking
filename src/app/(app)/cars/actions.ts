'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { carBasicsSchema } from '@/lib/schemas/car'
import { requireHousehold } from '@/lib/session'

export type CarBasicsState = { errors?: Record<string, string[] | undefined>; message?: string; ok?: boolean }

export async function updateCarBasics(_prev: CarBasicsState, formData: FormData): Promise<CarBasicsState> {
  const parsed = carBasicsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const { supabase } = await requireHousehold()
  const { id, ...fields } = parsed.data
  const { error } = await supabase.from('cars').update(fields).eq('id', id)
  if (error) return { message: error.message }
  revalidatePath('/garage')
  revalidatePath(`/cars/${id}`)
  return { ok: true }
}
