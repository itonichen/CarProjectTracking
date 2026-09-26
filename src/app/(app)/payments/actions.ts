'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { allocationSchema, newPaymentSchema } from '@/lib/schemas/payment'
import { requireHousehold } from '@/lib/session'

export type FormState = { errors?: Record<string, string[] | undefined>; message?: string; ok?: boolean }

export async function addAllocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = allocationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const { supabase, householdId } = await requireHousehold()
  const a = parsed.data
  const row: Record<string, string | number> =
    a.target === 'car'
      ? { household_id: householdId, payment_id: a.payment_id, car_id: a.car_id, cost_type: a.cost_type, amount_cents: a.amount }
      : { household_id: householdId, payment_id: a.payment_id, acquisition_id: a.acquisition_id, amount_cents: a.amount }
  const { error } = await supabase.from('payment_allocations').insert(row)
  if (error) return { message: friendlyError(error.message) }
  revalidatePath(`/payments/${a.payment_id}`)
  revalidatePath('/money')
  return { ok: true }
}

export async function removeAllocation(formData: FormData) {
  const parsed = z.object({ id: z.uuid(), payment_id: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase } = await requireHousehold()
  await supabase.from('payment_allocations').delete().eq('id', parsed.data.id)
  revalidatePath(`/payments/${parsed.data.payment_id}`)
  revalidatePath('/money')
}

export async function createPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPaymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }
  const { supabase, householdId } = await requireHousehold()
  const { amount, ...p } = parsed.data
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...p, household_id: householdId, amount_cents: amount })
    .select('id')
    .single()
  if (error) return { message: error.message }
  redirect(`/payments/${data.id}`)
}

function friendlyError(message: string) {
  if (message.includes('exceed payment amount')) return 'That is more than is left to assign on this payment.'
  if (message.includes('payment_allocations_car_cost_idx')) return 'This payment already has that cost type on that car. Remove it first to change the amount.'
  if (message.includes('payment_id_acquisition_id')) return 'This payment is already linked to that purchase.'
  return message
}
