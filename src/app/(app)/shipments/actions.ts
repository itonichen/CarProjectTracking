'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { builderShipmentSchema } from '@/lib/schemas/shipment'
import { requireHousehold } from '@/lib/session'

export type ShipState = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> }

export async function createBuilderShipment(input: z.input<typeof builderShipmentSchema>): Promise<ShipState> {
  const parsed = builderShipmentSchema.safeParse(input)
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const { supabase, householdId } = await requireHousehold()
  const { slot_ids, cost, ...s } = parsed.data
  const { error } = await supabase.rpc('create_builder_shipment', {
    p_shipment: { ...s, household_id: householdId, cost_cents: cost },
    p_slot_ids: slot_ids,
  })
  if (error) return { message: error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function markDelivered(formData: FormData) {
  const parsed = z.object({ id: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase } = await requireHousehold()
  await supabase.rpc('mark_shipment_delivered', { p_shipment: parsed.data.id })
  revalidatePath('/', 'layout')
}
