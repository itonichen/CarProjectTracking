'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { BUILD_STATUSES, type BuildStatus, type LocationStatus, type PaymentMethod } from '@/lib/domain'
import { requireHousehold } from '@/lib/session'

export type PartStatus = { id: string; label: string; category: BuildStatus; sort_order: number; at_builder: boolean }

export type PartDetail = {
  slot: {
    id: string
    car_id: string
    name: string
    notes: string | null
    fitment_notes: string | null
    status_id: string | null
    build_status: BuildStatus
    required_qty: number
    have_qty: number
    needs_review: boolean
  }
  purchases: {
    id: string
    title: string
    seller_name: string | null
    price_cents: number
    shipping_cents: number
    purchased_at: string | null
    location_status: LocationStatus
    payment_state: 'unpaid' | 'partial' | 'paid'
    payments: { id: string; method: PaymentMethod; paid_at: string; counterparty: string | null; memo: string | null; amount_cents: number }[]
  }[]
  /** Payments with money not yet assigned to anything, newest first. */
  unassigned: { id: string; method: PaymentMethod; paid_at: string; counterparty: string | null; memo: string | null; unallocated_cents: number }[]
}

export async function getPartStatuses(): Promise<PartStatus[]> {
  const { supabase } = await requireHousehold()
  const { data, error } = await supabase.from('part_statuses').select('id, label, category, sort_order, at_builder').order('sort_order')
  if (error) throw error
  return data as PartStatus[]
}

export async function setPartStatus(slotId: string, statusId: string): Promise<{ ok: boolean }> {
  const parsed = z.object({ slotId: z.uuid(), statusId: z.uuid() }).safeParse({ slotId, statusId })
  if (!parsed.success) return { ok: false }
  const { supabase } = await requireHousehold()
  const { error } = await supabase.from('part_slots').update({ status_id: statusId }).eq('id', slotId)
  if (error) return { ok: false }
  revalidatePath('/', 'layout')
  return { ok: true }
}

const newStatusSchema = z.object({
  label: z.string().trim().min(1, 'Name the status').max(40),
  category: z.enum(BUILD_STATUSES),
})

export async function addPartStatus(input: z.input<typeof newStatusSchema>): Promise<{ status?: PartStatus; error?: string }> {
  const parsed = newStatusSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { supabase, householdId } = await requireHousehold()
  const { data: last } = await supabase.from('part_statuses').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  const { data, error } = await supabase
    .from('part_statuses')
    .insert({ ...parsed.data, household_id: householdId, sort_order: (last?.sort_order ?? 0) + 10 })
    .select('id, label, category, sort_order, at_builder')
    .single()
  if (error) return { error: error.message.includes('unique') ? 'That status already exists.' : error.message }
  return { status: data as PartStatus }
}

export async function savePartNotes(slotId: string, notes: string): Promise<{ ok: boolean }> {
  const parsed = z.object({ slotId: z.uuid(), notes: z.string().max(5000) }).safeParse({ slotId, notes })
  if (!parsed.success) return { ok: false }
  const { supabase } = await requireHousehold()
  const { error } = await supabase.from('part_slots').update({ notes: parsed.data.notes.trim() || null }).eq('id', slotId)
  return { ok: !error }
}

export async function linkPaymentToPart(slotId: string, paymentId: string, amountCents: number): Promise<{ ok: boolean; message?: string }> {
  const parsed = z.object({ slotId: z.uuid(), paymentId: z.uuid(), amountCents: z.number().int().positive() }).safeParse({ slotId, paymentId, amountCents })
  if (!parsed.success) return { ok: false, message: 'Pick a payment and an amount.' }
  const { supabase } = await requireHousehold()
  const { error } = await supabase.rpc('link_payment_to_slot', { p_slot: slotId, p_payment: paymentId, p_amount: amountCents })
  if (error) return { ok: false, message: error.message.includes('exceed') ? 'That’s more than is left unassigned on this payment.' : error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}
