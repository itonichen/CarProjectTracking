'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { BUILD_STATUSES, type BuildStatus, type LocationStatus, type PaymentMethod } from '@/lib/domain'
import { requireHousehold } from '@/lib/session'

export type PartStatus = { id: string; label: string; category: BuildStatus; sort_order: number }

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
  const { data, error } = await supabase.from('part_statuses').select('id, label, category, sort_order').order('sort_order')
  if (error) throw error
  return data as PartStatus[]
}

export async function getPartDetail(slotId: string): Promise<PartDetail | null> {
  if (!z.uuid().safeParse(slotId).success) return null
  const { supabase } = await requireHousehold()
  const [slot, acq, unassigned] = await Promise.all([
    supabase
      .from('slot_progress')
      .select('id, car_id, name, notes, fitment_notes, status_id, build_status, required_qty, have_qty, needs_review')
      .eq('id', slotId)
      .maybeSingle(),
    supabase
      .from('acquisitions')
      .select('id, title, seller_name, price_cents, shipping_cents, purchased_at, location_status, payment_allocations(amount_cents, payment:payments(id, method, paid_at, counterparty, memo))')
      .eq('slot_id', slotId)
      .order('purchased_at', { ascending: false }),
    supabase
      .from('payment_matching')
      .select('id, method, paid_at, counterparty, memo, unallocated_cents')
      .gt('unallocated_cents', 0)
      .order('paid_at', { ascending: false }),
  ])
  if (slot.error) throw slot.error
  if (!slot.data) return null
  type AcqRow = Omit<PartDetail['purchases'][number], 'payments' | 'payment_state'> & {
    payment_allocations: { amount_cents: number; payment: Omit<PartDetail['purchases'][number]['payments'][number], 'amount_cents'> }[]
  }
  const purchases = ((acq.data ?? []) as unknown as AcqRow[]).map(({ payment_allocations, ...a }) => {
    const paid = payment_allocations.reduce((n, p) => n + p.amount_cents, 0)
    const cost = a.price_cents + a.shipping_cents
    return {
      ...a,
      payment_state: (paid === 0 ? 'unpaid' : paid < cost ? 'partial' : 'paid') as 'unpaid' | 'partial' | 'paid',
      payments: payment_allocations.map((p) => ({ ...p.payment, amount_cents: p.amount_cents })),
    }
  })
  return { slot: slot.data as PartDetail['slot'], purchases, unassigned: (unassigned.data ?? []) as PartDetail['unassigned'] }
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
    .select('id, label, category, sort_order')
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
