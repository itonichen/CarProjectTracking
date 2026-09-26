'use client'

import { useActionState } from 'react'
import { Car as CarIcon, Wrench } from 'lucide-react'
import type { Destination, YearRange } from '@/lib/domain'
import { updateSlot, type SlotFormState } from '../actions'

const field = 'mt-1 block h-11 w-full rounded-xl border border-border bg-bg px-3 text-base outline-none focus:border-accent'

type Props = {
  id: string
  required_qty: number
  destination: Destination
  range: YearRange | null
  fitment_notes: string | null
  needs_review: boolean
}

export function SlotDetailsForm(slot: Props) {
  const [state, action, pending] = useActionState<SlotFormState, FormData>(updateSlot, {})
  const err = (k: string) => state.errors?.[k]?.[0]

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={slot.id} />
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium">Quantity needed</span>
          <input name="required_qty" type="number" inputMode="numeric" min={1} defaultValue={slot.required_qty} className={field} />
          {err('required_qty') && <span role="alert" className="text-xs text-accent-strong">{err('required_qty')}</span>}
        </label>
        <fieldset className="min-w-0">
          <legend className="text-sm font-medium">Goes to</legend>
          <div className="mt-1 grid h-11 grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-medium">
            {(['builder', 'car'] as const).map((d) => (
              <label key={d} className="flex cursor-pointer items-center justify-center gap-1 rounded-lg has-[:checked]:bg-surface has-[:checked]:shadow-sm has-[:focus-visible]:outline-2">
                <input type="radio" name="destination" value={d} defaultChecked={slot.destination === d} className="sr-only" />
                {d === 'builder' ? <Wrench size={14} aria-hidden /> : <CarIcon size={14} aria-hidden />}
                {d === 'builder' ? 'Builder' : 'Car'}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">Fits years</legend>
        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input name="fits_from" inputMode="numeric" placeholder="Any" aria-label="From year" defaultValue={slot.range?.from ?? ''} className={field.replace('mt-1 ', '')} />
          <span className="text-muted">to</span>
          <input name="fits_to" inputMode="numeric" placeholder="Any" aria-label="To year" defaultValue={slot.range?.to ?? ''} className={field.replace('mt-1 ', '')} />
        </div>
        {(err('fits_from') || err('fits_to')) && <span role="alert" className="text-xs text-accent-strong">{err('fits_from') ?? err('fits_to')}</span>}
      </fieldset>

      <label className="block">
        <span className="text-sm font-medium">Fitment notes</span>
        <textarea name="fitment_notes" rows={3} defaultValue={slot.fitment_notes ?? ''} className={`${field} h-auto py-2`} />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="needs_review" defaultChecked={slot.needs_review} className="h-5 w-5 accent-[var(--accent)]" />
        Needs review
      </label>

      {state.message && <p role="alert" className="text-sm text-accent-strong">{state.message}</p>}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="h-11 rounded-xl bg-accent px-5 font-semibold text-white disabled:opacity-60">
          {pending ? 'Saving…' : 'Save details'}
        </button>
        {state.ok && !pending && <span role="status" className="text-sm text-ok">Saved</span>}
      </div>
    </form>
  )
}
