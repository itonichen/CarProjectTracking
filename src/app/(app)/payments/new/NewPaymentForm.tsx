'use client'

import { useActionState } from 'react'
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/lib/domain'
import { createPayment, type FormState } from '../actions'

const field = 'mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent'

export function NewPaymentForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPayment, {})
  const err = (k: string) => state.errors?.[k]?.[0]
  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Amount ($)</span>
          <input name="amount" inputMode="decimal" required className={field} />
          {err('amount') && <span role="alert" className="text-xs text-accent-strong">{err('amount')}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Paid with</span>
          <select name="method" defaultValue="zelle" className={field}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Paid to</span>
          <input name="counterparty" placeholder="Builder, seller…" className={field} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Date</span>
          <input name="paid_at" type="date" defaultValue={today} className={field} />
          {err('paid_at') && <span role="alert" className="text-xs text-accent-strong">{err('paid_at')}</span>}
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Memo or invoice number</span>
        <input name="memo" className={field} />
      </label>
      {state.message && <p role="alert" className="text-sm text-accent-strong">{state.message}</p>}
      <button disabled={pending} className="h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
        {pending ? 'Saving…' : 'Save, then assign'}
      </button>
    </form>
  )
}
