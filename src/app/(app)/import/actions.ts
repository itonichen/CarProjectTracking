'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { importPayloadSchema, type ImportPayload } from '@/lib/schemas/import'
import { requireHousehold } from '@/lib/session'

export type CommitResult = { ok: true; batchId: string; payments: number; purchases: number } | { ok: false; message: string }

export async function commitImport(input: ImportPayload): Promise<CommitResult> {
  const parsed = importPayloadSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: `Some rows are invalid: ${parsed.error.issues[0]?.path.join('.')} ${parsed.error.issues[0]?.message}` }
  const p = parsed.data
  if (!p.payments.length && !p.purchases.length) return { ok: false, message: 'No rows selected to import.' }

  const { supabase, householdId } = await requireHousehold()
  const today = new Date().toISOString().slice(0, 10)
  const payments: Record<string, unknown>[] = []
  const acquisitions: Record<string, unknown>[] = []
  const allocations: Record<string, unknown>[] = []

  for (const pay of p.payments) {
    const { assign, ...row } = pay
    payments.push({ ...row, method: p.method })
    if (assign.as === 'parts') {
      // A payment to a parts seller becomes a purchase for that car.
      const acqId = crypto.randomUUID()
      acquisitions.push({
        id: acqId,
        car_id: assign.car_id,
        title: pay.memo ?? `Parts from ${pay.counterparty ?? 'unknown seller'}`,
        source: 'other',
        seller_name: pay.counterparty,
        price_cents: pay.amount_cents,
        purchased_at: pay.paid_at,
        location_status: p.location_status,
        notes: `Imported from ${p.filename}`,
      })
      allocations.push({ payment_id: pay.id, acquisition_id: acqId, amount_cents: pay.amount_cents })
    } else if (assign.as !== 'none') {
      allocations.push({ payment_id: pay.id, car_id: assign.car_id, cost_type: assign.as, amount_cents: pay.amount_cents })
    }
  }

  for (const pur of p.purchases) {
    const { payment_method, ...row } = pur
    acquisitions.push({ ...row, location_status: p.location_status })
    const total = pur.price_cents + pur.shipping_cents
    if (payment_method && total > 0) {
      const payId = crypto.randomUUID()
      payments.push({ id: payId, method: payment_method, amount_cents: total, paid_at: pur.purchased_at ?? today, counterparty: pur.seller_name, memo: null, external_id: null, raw: null })
      allocations.push({ payment_id: payId, acquisition_id: pur.id, amount_cents: total })
    }
  }

  const { data, error } = await supabase.rpc('import_commit', {
    p_batch: { id: crypto.randomUUID(), household_id: householdId, kind: p.kind, filename: p.filename },
    p_payments: payments,
    p_acquisitions: acquisitions,
    p_allocations: allocations,
  })
  if (error) {
    const dup = error.message.includes('payments_external_id_idx')
    return { ok: false, message: dup ? 'Some of these transactions were already imported. Reload the page and try again.' : error.message }
  }
  revalidatePath('/', 'layout')
  return { ok: true, batchId: data as string, payments: payments.length, purchases: acquisitions.length }
}

export async function undoImport(formData: FormData) {
  const parsed = z.object({ id: z.uuid() }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return
  const { supabase } = await requireHousehold()
  await supabase.from('import_batches').delete().eq('id', parsed.data.id)
  revalidatePath('/', 'layout')
}
