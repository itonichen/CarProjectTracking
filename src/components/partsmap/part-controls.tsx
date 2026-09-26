'use client'

import { useState, useTransition } from 'react'
import { Check, Plus } from 'lucide-react'
import type { BuildStatus } from '@/lib/domain'
import type { Bucket } from '@/lib/partsmap/buckets'
import { formatCents, parseDollarsToCents } from '@/lib/money'
import { addPartStatus, linkPaymentToPart, savePartNotes, setPartStatus, type PartDetail, type PartStatus } from './actions'
import { StatusDot } from './StatusDot'

// Controls for one part: status, notes, linking a payment. Used on the part page.

type Unassigned = PartDetail['unassigned'][number]

const CATEGORY_LABEL: Record<BuildStatus, string> = {
  needed: 'Still needed',
  sourcing: 'Sourcing',
  have: 'Have it',
  installed: 'Installed',
}

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const fmtDate = (d: string | null) => (d ? dateFmt.format(new Date(`${d}T12:00:00`)) : '')

export function statusBucket(s: Pick<PartStatus, 'category' | 'at_builder'>): Bucket {
  return s.category === 'installed' ? 'built' : s.category === 'have' ? (s.at_builder ? 'shipped' : 'bought') : 'need'
}

export function StatusPicker({
  slotId,
  current,
  statuses,
  onStatusesChange,
  onChange,
  heading = true,
}: {
  slotId: string
  current: string | null
  statuses: PartStatus[]
  onStatusesChange: (s: PartStatus[]) => void
  onChange: (s: PartStatus) => void
  /** Hide the "Status" heading when the page already shows one. */
  heading?: boolean
}) {
  const [selected, setSelected] = useState(current)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<BuildStatus>('have')
  const [, start] = useTransition()

  function choose(s: PartStatus) {
    const prev = selected
    setSelected(s.id)
    setError(null)
    onChange(s)
    start(async () => {
      const res = await setPartStatus(slotId, s.id)
      if (!res.ok) {
        setSelected(prev)
        setError('Couldn’t save the status. Try again.')
      }
    })
  }

  function add() {
    start(async () => {
      const res = await addPartStatus({ label, category })
      if (res.error) return setError(res.error)
      onStatusesChange([...statuses, res.status!])
      setAdding(false)
      setLabel('')
      setError(null)
    })
  }

  return (
    <section aria-labelledby={`status-${slotId}`}>
      <h3 id={`status-${slotId}`} className={heading ? 'mb-2 text-sm font-semibold' : 'sr-only'}>
        Status
      </h3>
      <div role="radiogroup" aria-labelledby={`status-${slotId}`} className="flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected === s.id}
            onClick={() => choose(s)}
            className={`inline-flex h-9 items-center gap-2 rounded-full border px-3 text-sm ${
              selected === s.id ? 'border-text bg-text text-surface' : 'border-border hover:border-muted'
            }`}
          >
            <span className={selected === s.id ? 'rounded-full bg-surface p-px' : ''}>
              <StatusDot bucket={statusBucket(s)} size={10} />
            </span>
            {s.label}
          </button>
        ))}
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="inline-flex h-9 items-center gap-1 rounded-full border border-dashed border-border px-3 text-sm text-muted hover:text-text">
            <Plus aria-hidden size={14} />
            Add status
          </button>
        )}
      </div>
      {adding && (
        <div className="mt-2 space-y-2 rounded-xl border border-border bg-bg p-3">
          <label className="block text-sm">
            <span className="font-medium">New status</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Out for powder coat" maxLength={40} autoFocus className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-base" />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Counts as</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as BuildStatus)} className="mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2 text-sm">
              {(['needed', 'sourcing', 'have', 'installed'] as const).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted">Decides how the part counts on the map and the buy list.</span>
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={add} disabled={!label.trim()} className="h-9 flex-1 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-50">
              Add status
            </button>
            <button type="button" onClick={() => setAdding(false)} className="h-9 flex-1 rounded-lg border border-border text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-1.5 text-xs text-accent-strong">{error}</p>}
    </section>
  )
}

export function Notes({ slotId, initial }: { slotId: string; initial: string }) {
  const [value, setValue] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function save() {
    if (value === saved) return
    setState('saving')
    const res = await savePartNotes(slotId, value)
    if (res.ok) {
      setSaved(value)
      setState('saved')
    } else setState('error')
  }

  return (
    <section>
      <label className="block">
        <span className="mb-2 flex items-baseline justify-between text-sm font-semibold">
          Notes
          <span className="text-xs font-normal text-muted" role="status">
            {state === 'saving' ? 'Saving…' : state === 'saved' && value === saved ? 'Saved' : state === 'error' ? 'Not saved' : ''}
          </span>
        </span>
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setState('idle')
          }}
          onBlur={save}
          rows={4}
          placeholder="Part numbers, who has it, what to check…"
          className="block w-full rounded-xl border border-border bg-bg px-3 py-2 text-base outline-none focus:border-accent"
        />
      </label>
      {value !== saved && (
        <button type="button" onClick={save} className="mt-1.5 h-8 rounded-lg border border-border px-3 text-xs font-medium">
          Save notes
        </button>
      )}
    </section>
  )
}

/** Link one of the household's unassigned payments to this part. */
export function LinkPayment({ slotId, unassigned, onLinked }: { slotId: string; unassigned: Unassigned[]; onLinked: () => void }) {
  const [paymentId, setPaymentId] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const chosen = unassigned.find((p) => p.id === paymentId)

  function link() {
    const cents = parseDollarsToCents(amount)
    if (!chosen || !cents) return setMessage('Pick a payment and an amount.')
    start(async () => {
      const res = await linkPaymentToPart(slotId, chosen.id, cents)
      if (!res.ok) return setMessage(res.message ?? 'Couldn’t link that payment.')
      setPaymentId('')
      setAmount('')
      setMessage(null)
      onLinked()
    })
  }

  if (unassigned.length === 0) return <p className="text-sm text-muted">No unassigned payments to link.</p>

  return (
    <div className="space-y-2">
      <label className="block text-sm">
        <span className="font-medium">Link a payment</span>
        <select
          value={paymentId}
          onChange={(e) => {
            setPaymentId(e.target.value)
            const p = unassigned.find((x) => x.id === e.target.value)
            setAmount(p ? (p.unallocated_cents / 100).toFixed(2) : '')
          }}
          className="mt-1 block h-10 w-full rounded-lg border border-border bg-bg px-2 text-sm"
        >
          <option value="">Choose from {unassigned.length} unassigned…</option>
          {unassigned.map((p) => (
            <option key={p.id} value={p.id}>
              {fmtDate(p.paid_at)} · {p.counterparty ?? 'unknown'} · {formatCents(p.unallocated_cents)}
              {p.memo ? ` · ${p.memo.slice(0, 40)}` : ''}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <div className="flex items-end gap-2">
          <label className="block min-w-0 flex-1 text-sm">
            <span className="font-medium">Amount for this part ($)</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" className="mt-1 block h-10 w-full rounded-lg border border-border bg-bg px-2.5 text-base" />
          </label>
          <button type="button" onClick={link} disabled={pending} className="inline-flex h-10 items-center gap-1 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60">
            <Check aria-hidden size={16} />
            Link
          </button>
        </div>
      )}
      {chosen?.memo && <p className="text-xs text-muted">“{chosen.memo}”</p>}
      {message && <p role="alert" className="text-xs text-accent-strong">{message}</p>}
      <p className="text-xs text-muted">Linking records a purchase for this part and assigns the payment to it. Use part of a payment if it covered several parts.</p>
    </div>
  )
}
