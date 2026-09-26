'use client'

import { useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { THEME_COOKIE, type Theme } from '@/lib/theme'

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
]

function apply(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`
}

/** Segmented System / Light / Dark control. `compact` shows icons only. */
export function ThemeToggle({ initial, compact = false }: { initial: Theme; compact?: boolean }) {
  const [theme, setTheme] = useState(initial)
  return (
    <div role="radiogroup" aria-label="Color theme" className="inline-flex rounded-lg bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={compact ? label : undefined}
          title={label}
          onClick={() => {
            setTheme(value)
            apply(value)
          }}
          className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium ${
            theme === value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
          }`}
        >
          <Icon aria-hidden size={15} />
          {!compact && label}
        </button>
      ))}
    </div>
  )
}
