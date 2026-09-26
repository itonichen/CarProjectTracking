import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { COST_TYPE_LABELS, PAYMENT_METHOD_LABELS, type CostType, type PaymentMethod } from '@/lib/domain'
import { formatCents } from '@/lib/money'
import { requireHousehold } from '@/lib/session'
import { removeAllocation } from '../actions'
import { AssignForm, type PurchaseOption } from './AssignForm'

export const metadata: Metadata = { title: 'Payment' }

type Allocation = {
  id: string
  amount_cents: number
  cost_type: CostType | null
  car: { id: string; nickname: string } | null
  acquisition: { id: string; title: string; car: { nickname: string } | null } | null
}

export default async function PaymentPage(props: PageProps<'/payments/[paymentId]'>) {
  const { paymentId } = await props.params
  const { supabase } = await requireHousehold()

  const [payment, allocations, cars, owed] = await Promise.all([
    supabase.from('payment_matching').select('id, method, amount_cents, allocated_cents, unallocated_cents, paid_at, counterparty, memo').eq('id', paymentId).maybeSingle(),
    supabase
      .from('payment_allocations')
      .select('id, amount_cents, cost_type, car:cars(id, nickname), acquisition:acquisitions(id, title, car:cars(nickname))')
      .eq('payment_id', paymentId)
      .order('created_at'),
    supabase.from('cars').select('id, nickname').order('created_at'),
    supabase
      .from('acquisition_money')
      .select('acquisition_id, cost_cents, allocated_cents, acquisition:acquisitions(title, seller_name, car:cars(nickname))')
      .neq('payment_state', 'paid'),
  ])
  if (payment.error) throw payment.error
  if (!payment.data) notFound()
  const p = payment.data as { id: string; method: PaymentMethod; amount_cents: number; allocated_cents: number; unallocated_cents: number; paid_at: string; counterparty: string | null; memo: string | null }
  const allocs = (allocations.data ?? []) as unknown as Allocation[]

  const purchases: PurchaseOption[] = ((owed.data ?? []) as unknown as {
    acquisition_id: string
    cost_cents: number
    allocated_cents: number
    acquisition: { title: string; seller_name: string | null; car: { nickname: string } | null }
  }[]).map((a) => ({
    id: a.acquisition_id,
    label: a.acquisition.seller_name ? `${a.acquisition.title} from ${a.acquisition.seller_name}` : a.acquisition.title,
    car: a.acquisition.car?.nickname ?? 'No car',
    owed_cents: a.cost_cents - a.allocated_cents,
  }))

  return (
    <div>
      <PageHeader
        title={formatCents(p.amount_cents)}
        subtitle={`${PAYMENT_METHOD_LABELS[p.method]} to ${p.counterparty ?? 'unknown'} · ${p.paid_at}`}
        back={{ href: '/money', label: 'Money' }}
      />
      <div className="mx-auto max-w-lg space-y-6 px-4 py-4">
        {p.memo && <p className="text-sm text-muted">“{p.memo}”</p>}

        <section aria-labelledby="assigned-h">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="assigned-h" className="text-sm font-semibold text-muted">Assigned</h2>
            <span className="tabular text-sm">
              {formatCents(p.allocated_cents)} of {formatCents(p.amount_cents)}
            </span>
          </div>
          {allocs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">
              Not assigned yet. It stays in the “to assign” list on Money until you do.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {allocs.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    {a.car ? (
                      <>
                        <Link href={`/cars/${a.car.id}`} className="font-medium hover:underline">{a.car.nickname}</Link>
                        <div className="text-xs text-muted">{COST_TYPE_LABELS[a.cost_type!]}</div>
                      </>
                    ) : (
                      <>
                        <div className="truncate font-medium">{a.acquisition?.title}</div>
                        <div className="text-xs text-muted">Part purchase · {a.acquisition?.car?.nickname ?? 'No car'}</div>
                      </>
                    )}
                  </div>
                  <span className="tabular text-sm font-semibold">{formatCents(a.amount_cents)}</span>
                  <form action={removeAllocation}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="payment_id" value={p.id} />
                    <button aria-label="Remove this assignment" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text">
                      <X size={16} aria-hidden />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {p.unallocated_cents > 0 && (
          <section aria-labelledby="assign-h" className="rounded-2xl border border-border bg-surface p-4">
            <h2 id="assign-h" className="mb-3 font-semibold">
              Assign {formatCents(p.unallocated_cents)}
            </h2>
            <AssignForm paymentId={p.id} remainingCents={p.unallocated_cents} cars={cars.data ?? []} purchases={purchases} />
          </section>
        )}
      </div>
    </div>
  )
}
