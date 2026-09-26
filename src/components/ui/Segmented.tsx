'use client'

import { useRef } from 'react'

/** Segmented tabs (role=tablist) with arrow-key support. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = 'md',
}: {
  label: string
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + options.length) % options.length
    onChange(options[n][0])
    refs.current[n]?.focus()
  }
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-[10px] bg-surface-2 p-[3px]">
      {options.map(([v, text], i) => (
        <button
          key={v}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="tab"
          aria-selected={value === v}
          tabIndex={value === v ? 0 : -1}
          onClick={() => onChange(v)}
          onKeyDown={(e) => onKey(e, i)}
          className={`rounded-lg ${size === 'sm' ? 'min-h-8 px-3 text-[13px]' : 'min-h-9 px-3.5 text-sm'} ${
            value === v ? 'bg-surface text-text shadow-[0_1px_2px_rgba(0,0,0,.08)]' : 'text-muted hover:text-text'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
