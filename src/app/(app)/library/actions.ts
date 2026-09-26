'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireHousehold } from '@/lib/session'
import { SLOT_TYPES } from '@/lib/templates.labels'

const schema = z.object({
  figure_id: z.uuid(),
  template_key: z.string().refine((k) => SLOT_TYPES.some((s) => s.key === k), 'Unknown slot type'),
})

export async function linkFigure(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase, householdId } = await requireHousehold()
  await supabase.from('figure_slot_links').upsert({ ...parsed.data, household_id: householdId })
  revalidatePath('/', 'layout')
}

export async function unlinkFigure(formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase } = await requireHousehold()
  await supabase.from('figure_slot_links').delete().eq('figure_id', parsed.data.figure_id).eq('template_key', parsed.data.template_key)
  revalidatePath('/', 'layout')
}
