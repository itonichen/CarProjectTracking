'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { carBasicsSchema, carNameSchema } from '@/lib/schemas/car'
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

/** Rename a car; only the nickname changes. */
export async function renameCar(id: string, nickname: string): Promise<{ ok: true; nickname: string } | { ok: false; message: string }> {
  const parsed = carNameSchema.safeParse({ id, nickname })
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
  const { supabase } = await requireHousehold()
  const { error } = await supabase.from('cars').update({ nickname: parsed.data.nickname }).eq('id', parsed.data.id)
  if (error) return { ok: false, message: 'Couldn’t save the name. Try again.' }
  revalidatePath('/', 'layout')
  return { ok: true, nickname: parsed.data.nickname }
}
