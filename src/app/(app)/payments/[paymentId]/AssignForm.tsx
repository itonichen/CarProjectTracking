'use client'

import { useActionState, useState } from 'react'
import { COST_TYPES, COST_TYPE_LABELS } from '@/lib/domain'
import { formatCents } from '@/lib/money'
import { addAllocation, type FormState } from '../actions'

const field = 'mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent'

export type CarOption = { id: string; nickname: string }
export type PurchaseOption = { id: string; label: string; car: string; owed_cents: number }

export function AssignForm({
  paymentId,
  remainingCents,
  cars,
  purchases,
}: {
  paymentId: string
  remainingCents: number
  cars: CarOption[]
  purchases: PurchaseOption[]
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(addAllocation, {})
  const [target, setTarget] = useState<'car' | 'acquisition'>('car')
  const err = (k: string) => state.errors?.[k]?.[0]
  const remaining = (remainingCents / 100).toFixed(2)

  return (
    <form action={action} key={remainingCents} className="space-y-3">
      <input type="hidden" name="payment_id" value={paymentId} />
      <input type="hidden" name="target" value={target} />

      <div role="radiogroup" aria-label="Assign to" className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-medium">
        {(
          [
            ['car', 'A car (labor, etc.)'],
            ['acquisition', 'A part purchase'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={target === value}
            onClick={() => setTarget(value)}
            className={`h-9 rounded-lg ${target === value ? 'bg-surface shadow-sm' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {target === 'car' ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium">Car</span>
            <select name="car_id" required defaultValue="" className={field}>
              <option value="" disabled>Choose…</option>
              {cars.map((c) => (
                <option key={c.id} value={c.id}>{c.nickname}</option>
              ))}
            </select>
            {err('car_id') && <span role="alert" className="text-xs text-accent-strong">{err('car_id')}</span>}
          </label>
          <label className="block">
            <span className="text-sm font-medium">For</span>
            <select name="cost_type" defaultValue="labor" className={field}>
              {COST_TYPES.map((t) => (
                <option key={t} value={t}>{COST_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>
        </div>
      ) : purchases.length ? (
        <label className="block">
          <span className="text-sm font-medium">Purchase</span>
          <select name="acquisition_id" required defaultValue="" className={field}>
            <option value="" disabled>Choose…</option>
            {purchases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.car} · {p.label} ({formatCents(p.owed_cents)} unpaid)
              </option>
            ))}
          </select>
          {err('acquisition_id') && <span role="alert" className="text-xs text-accent-strong">{err('acquisition_id')}</span>}
        </label>
      ) : (
        <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-muted">No unpaid part purchases to link. Add the purchase first, then link it here.</p>
      )}

      <label className="block">
        <span className="text-sm font-medium">Amount ($)</span>
        <input name="amount" inputMode="decimal" defaultValue={remaining} className={field} />
        <span className="mt-1 block text-xs text-muted">Split a payment by assigning part of it now and the rest after.</span>
        {err('amount') && <span role="alert" className="text-xs text-accent-strong">{err('amount')}</span>}
      </label>

      {state.message && <p role="alert" className="text-sm text-accent-strong">{state.message}</p>}
      <button disabled={pending || (target === 'acquisition' && !purchases.length)} className="h-11 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
        {pending ? 'Assigning…' : 'Assign'}
      </button>
    </form>
  )
}
