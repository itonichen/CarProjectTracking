import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, FileUp, Plus } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/domain'
import { formatCents } from '@/lib/money'
import { requireHousehold } from '@/lib/session'

export const metadata: Metadata = { title: 'Money' }

type PaymentRow = { id: string; method: PaymentMethod; amount_cents: number; unallocated_cents: number; paid_at: string; counterparty: string | null; memo: string | null }

// First slice of the Money screen: payments still to assign.
// TODO: totals by car, system, method and seller; spent vs budget per car.
export default async function MoneyPage() {
  const { supabase } = await requireHousehold()
  const { data, error } = await supabase
    .from('payment_matching')
    .select('id, method, amount_cents, unallocated_cents, paid_at, counterparty, memo')
    .gt('unallocated_cents', 0)
    .order('paid_at', { ascending: false })
  if (error) throw error
  const rows = data as PaymentRow[]
  const total = rows.reduce((n, r) => n + r.unallocated_cents, 0)

  return (
    <div>
      <PageHeader
        title="Money"
        action={
          <div className="flex gap-2">
            <Link href="/import" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium">
              <FileUp aria-hidden size={16} />
              Import
            </Link>
            <Link href="/payments/new" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium">
              <Plus aria-hidden size={16} />
              Payment
            </Link>
          </div>
        }
      />
      <div className="mx-auto max-w-2xl px-4 py-4 md:px-8">
        <section aria-labelledby="unassigned-h">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="unassigned-h" className="text-sm font-semibold text-muted">To assign</h2>
            {rows.length > 0 && <span className="tabular text-sm text-muted">{formatCents(total)} across {rows.length}</span>}
          </div>
          {rows.length === 0 ? (
            <EmptyState title="Every payment is assigned">New payments and invoices show up here until you assign them to a car or a part purchase.</EmptyState>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/payments/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.counterparty ?? 'Unknown payee'}</div>
                      <div className="truncate text-xs text-muted">
                        {PAYMENT_METHOD_LABELS[r.method]} · {r.paid_at}
                        {r.memo ? ` · ${r.memo}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="tabular font-semibold">{formatCents(r.amount_cents)}</div>
                      {r.unallocated_cents < r.amount_cents && <div className="tabular text-xs text-warn">{formatCents(r.unallocated_cents)} left</div>}
                    </div>
                    <ChevronRight aria-hidden size={16} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
