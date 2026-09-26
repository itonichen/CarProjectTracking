'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { renameCar } from '@/app/(app)/cars/actions'

const TYPE = 'text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] md:text-[34px]'

/** The car's name as the page title, editable in place. */
export function CarTitle({ carId, nickname }: { carId: string; nickname: string }) {
  const router = useRouter()
  const [name, setName] = useState(nickname)
  const [draft, setDraft] = useState(nickname)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const input = useRef<HTMLInputElement>(null)
  // Escape both cancels and blurs; don't let that blur save.
  const cancelled = useRef(false)

  function edit() {
    cancelled.current = false
    setDraft(name)
    setError(null)
    setEditing(true)
    requestAnimationFrame(() => input.current?.select())
  }

  function save() {
    if (cancelled.current) {
      cancelled.current = false
      return
    }
    const next = draft.trim()
    if (next === name) return setEditing(false)
    if (!next) return setError('Name can’t be empty')
    const prev = name
    setName(next)
    setEditing(false)
    start(async () => {
      const res = await renameCar(carId, next)
      if (!res.ok) {
        setName(prev)
        setDraft(next)
        setError(res.message)
        setEditing(true)
        return
      }
      router.refresh()
    })
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <label className="sr-only" htmlFor={`car-name-${carId}`}>
          Car name
        </label>
        <input
          id={`car-name-${carId}`}
          ref={input}
          value={draft}
          maxLength={60}
          onChange={(e) => {
            setDraft(e.target.value)
            setError(null)
          }}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save()
            } else if (e.key === 'Escape') {
              cancelled.current = true
              setDraft(name)
              setError(null)
              setEditing(false)
            }
          }}
          aria-invalid={!!error}
          aria-describedby={error ? `car-name-err-${carId}` : undefined}
          className={`${TYPE} -mx-2 w-[min(100%,22ch)] rounded-lg border border-border bg-surface px-2 py-0.5 outline-none focus:border-accent`}
        />
        {error ? (
          <span id={`car-name-err-${carId}`} role="alert" className="text-sm text-accent-strong">
            {error}
          </span>
        ) : (
          <span className="text-xs text-muted">Enter to save · Esc to cancel</span>
        )}
      </div>
    )
  }

  return (
    <h1 className={`${TYPE} group flex items-center gap-1.5`}>
      <button type="button" onClick={edit} className="-mx-1 rounded-lg px-1 text-left hover:bg-surface-2" title="Rename car">
        {name}
      </button>
      <button
        type="button"
        onClick={edit}
        aria-label={`Rename ${name}`}
        disabled={pending}
        className="grid h-9 w-9 place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-text md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
      >
        <Pencil aria-hidden size={18} />
      </button>
    </h1>
  )
}
