'use client'

import { useRef } from 'react'
import { LOCATION_LABELS, LOCATION_STATUSES, type LocationStatus } from '@/lib/domain'
import { setLocation } from '../actions'

/** Changing the select saves immediately and adds a timeline entry. */
export function LocationSelect({ id, slotId, value }: { id: string; slotId: string; value: LocationStatus }) {
  const form = useRef<HTMLFormElement>(null)
  return (
    <form ref={form} action={setLocation}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="slot_id" value={slotId} />
      <label className="block">
        <span className="sr-only">Where is it?</span>
        <select
          name="location_status"
          defaultValue={value}
          key={value}
          onChange={() => form.current?.requestSubmit()}
          className="h-9 w-full rounded-lg border border-border bg-bg px-2 text-sm"
        >
          {LOCATION_STATUSES.map((l) => (
            <option key={l} value={l}>{LOCATION_LABELS[l]}</option>
          ))}
        </select>
      </label>
    </form>
  )
}
