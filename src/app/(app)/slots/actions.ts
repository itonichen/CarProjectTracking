'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { buildStatusSchema, locationSchema, slotUpdateSchema } from '@/lib/schemas/slot'
import { requireHousehold } from '@/lib/session'

export type SlotFormState = { errors?: Record<string, string[] | undefined>; message?: string; ok?: boolean }

export async function updateSlot(_prev: SlotFormState, formData: FormData): Promise<SlotFormState> {
  const parsed = slotUpdateSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const { supabase } = await requireHousehold()
  const { id, ...fields } = parsed.data
  const { error } = await supabase.from('part_slots').update(fields).eq('id', id)
  if (error) return { message: error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function setBuildStatus(formData: FormData) {
  const parsed = buildStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase } = await requireHousehold()
  await supabase.from('part_slots').update({ build_status: parsed.data.build_status }).eq('id', parsed.data.id)
  revalidatePath('/', 'layout')
}

export async function setLocation(formData: FormData) {
  const parsed = locationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase } = await requireHousehold()
  await supabase.from('acquisitions').update({ location_status: parsed.data.location_status }).eq('id', parsed.data.id)
  revalidatePath('/', 'layout')
}

const attachmentSchema = z.object({
  entity_type: z.enum(['slot', 'acquisition']),
  entity_id: z.uuid(),
  storage_path: z.string().min(1),
})

export async function addAttachment(input: z.input<typeof attachmentSchema>) {
  const parsed = attachmentSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid photo' }
  const { supabase, householdId } = await requireHousehold()
  const a = parsed.data
  if (!a.storage_path.startsWith(`${householdId}/${a.entity_type}/${a.entity_id}/`)) return { error: 'Photo path does not match' }
  const { error } = await supabase.from('attachments').insert({ ...a, household_id: householdId })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return {}
}
