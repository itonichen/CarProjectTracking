'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getQuickAddOptions } from './actions'
import { QuickAddForm, type Prefill } from './QuickAddForm'

type Options = Awaited<ReturnType<typeof getQuickAddOptions>>
type Ctx = { open: (prefill?: Prefill) => void }

const QuickAddContext = createContext<Ctx | null>(null)

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used inside QuickAddProvider')
  return ctx
}

/** Owns the Quick add sheet so any screen can open it. */
export function QuickAddProvider({ children }: { children: React.ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [options, setOptions] = useState<Options | null>(null)
  const [prefill, setPrefill] = useState<Prefill>({})
  const [session, setSession] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)

  const open = useCallback((p: Prefill = {}) => {
    setPrefill(p)
    setSession((s) => s + 1)
    setLoadError(null)
    dialogRef.current?.showModal()
    // Refresh cars and slots each time so new slots and statuses show up.
    getQuickAddOptions()
      .then(setOptions)
      .catch(() => setLoadError('Couldn’t load your cars. Check your connection and try again.'))
  }, [])

  const close = useCallback(() => dialogRef.current?.close(), [])

  // Close when tapping the backdrop.
  useEffect(() => {
    const d = dialogRef.current
    if (!d) return
    const onClick = (e: MouseEvent) => {
      if (e.target === d) d.close()
    }
    d.addEventListener('click', onClick)
    return () => d.removeEventListener('click', onClick)
  }, [])

  return (
    <QuickAddContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        aria-labelledby="quick-add-title"
        className="m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl border border-border bg-surface p-0 text-text backdrop:bg-black/50 md:m-auto md:max-w-lg md:rounded-2xl"
      >
        <div className="flex max-h-[92dvh] flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 id="quick-add-title" className="text-lg font-semibold">
              Quick add
            </h2>
            <button type="button" onClick={close} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface-2">
              <X size={18} aria-hidden />
            </button>
          </header>
          {loadError ? (
            <p role="alert" className="p-4 text-sm text-accent-strong">{loadError}</p>
          ) : options ? (
            <QuickAddForm key={session} options={options} prefill={prefill} onDone={close} />
          ) : (
            <p className="p-6 text-center text-sm text-muted">Loading…</p>
          )}
        </div>
      </dialog>
    </QuickAddContext.Provider>
  )
}
