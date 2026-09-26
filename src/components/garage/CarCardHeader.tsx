'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateCarBasics, type CarBasicsState } from '@/app/(app)/cars/actions'

type Props = { id: string; nickname: string; trim: string | null; color: string | null; children?: React.ReactNode }

const input = 'block h-10 w-full rounded-lg border border-border bg-bg px-2.5 text-base outline-none focus:border-accent'

/** Card title with inline editing of name, model and color. */
export function CarCardHeader({ id, nickname, trim, color, children }: Props) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState<CarBasicsState, FormData>(async (prev, fd) => {
    const result = await updateCarBasics(prev, fd)
    if (result.ok) setEditing(false)
    return result
  }, {})
  const err = (k: string) => state.errors?.[k]?.[0]

  if (editing) {
    return (
      <form action={action} className="space-y-2" onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}>
        <input type="hidden" name="id" value={id} />
        <label className="block">
          <span className="text-xs text-muted">Name</span>
          <input name="nickname" defaultValue={nickname} required autoFocus className={input} />
          {err('nickname') && <span role="alert" className="text-xs text-accent-strong">{err('nickname')}</span>}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-muted">Model</span>
            <input name="trim" defaultValue={trim ?? ''} placeholder="SL, VR-4…" className={input} />
          </label>
          <label className="block">
            <span className="text-xs text-muted">Color</span>
            <input name="color" defaultValue={color ?? ''} className={input} />
          </label>
        </div>
        {state.message && <p role="alert" className="text-xs text-accent-strong">{state.message}</p>}
        <div className="flex gap-2">
          <button disabled={pending} className="h-9 flex-1 rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-60">
            {pending ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="h-9 flex-1 rounded-lg border border-border text-sm font-medium">
            Cancel
          </button>
        </div>
      </form>
    )
  }

  const details = [trim, color].filter(Boolean).join(' · ')
  return (
    <div className="flex items-start justify-between gap-2">
      <Link href={`/cars/${id}`} className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold">{nickname}</h2>
        {details && <p className="truncate text-sm text-muted">{details}</p>}
        {children && <div className="mt-1">{children}</div>}
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`Edit name, model and color of ${nickname}`}
        className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
      >
        <Pencil aria-hidden size={16} />
      </button>
    </div>
  )
}
