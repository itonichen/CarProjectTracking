import { NextResponse, type NextRequest } from 'next/server'
import { toCsv } from '@/lib/csv'
import { requireHousehold } from '@/lib/session'

const dollars = (cents: number | null) => (cents == null ? '' : (cents / 100).toFixed(2))

type AcqRow = {
  id: string
  title: string
  qty: number
  condition: string | null
  source: string
  seller_name: string | null
  listing_url: string | null
  price_cents: number
  shipping_cents: number
  purchased_at: string | null
  location_status: string
  notes: string | null
  car: { nickname: string } | null
  slot: { name: string; system: string } | null
}

type PayRow = {
  id: string
  method: string
  amount_cents: number
  allocated_cents: number
  unallocated_cents: number
  paid_at: string
  counterparty: string | null
  memo: string | null
  external_id: string | null
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/export/[kind]'>) {
  const { kind } = await ctx.params
  const { supabase } = await requireHousehold()
  const stamp = new Date().toISOString().slice(0, 10)
  let csv: string

  if (kind === 'purchases') {
    const [acq, money] = await Promise.all([
      supabase
        .from('acquisitions')
        .select('id, title, qty, condition, source, seller_name, listing_url, price_cents, shipping_cents, purchased_at, location_status, notes, car:cars(nickname), slot:part_slots(name, system)')
        .order('purchased_at', { ascending: false }),
      supabase.from('acquisition_money').select('acquisition_id, allocated_cents, payment_state'),
    ])
    if (acq.error) throw acq.error
    const m = new Map((money.data ?? []).map((r) => [r.acquisition_id as string, r as { allocated_cents: number; payment_state: string }]))
    csv = toCsv(
      ['date', 'car', 'system', 'slot', 'part', 'qty', 'condition', 'source', 'seller', 'price', 'shipping', 'total', 'paid', 'payment_state', 'location', 'listing_url', 'notes', 'id'],
      (acq.data as unknown as AcqRow[]).map((a) => [
        a.purchased_at,
        a.car?.nickname,
        a.slot?.system,
        a.slot?.name,
        a.title,
        a.qty,
        a.condition,
        a.source,
        a.seller_name,
        dollars(a.price_cents),
        dollars(a.shipping_cents),
        dollars(a.price_cents + a.shipping_cents),
        dollars(m.get(a.id)?.allocated_cents ?? 0),
        m.get(a.id)?.payment_state,
        a.location_status,
        a.listing_url,
        a.notes,
        a.id,
      ]),
    )
  } else if (kind === 'payments') {
    const pay = await supabase
      .from('payment_matching')
      .select('id, method, amount_cents, allocated_cents, unallocated_cents, paid_at, counterparty, memo, external_id')
      .order('paid_at', { ascending: false })
    if (pay.error) throw pay.error
    csv = toCsv(
      ['date', 'method', 'paid_to', 'amount', 'assigned', 'unassigned', 'memo', 'transaction_id', 'id'],
      (pay.data as PayRow[]).map((p) => [p.paid_at, p.method, p.counterparty, dollars(p.amount_cents), dollars(p.allocated_cents), dollars(p.unallocated_cents), p.memo, p.external_id, p.id]),
    )
  } else {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="garage-${kind}-${stamp}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
