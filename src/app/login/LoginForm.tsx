'use client'

import { useActionState } from 'react'
import { sendMagicLink, type LoginState } from './actions'

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(sendMagicLink, { status: 'idle' })

  if (state.status === 'sent') {
    return (
      <div role="status" className="rounded-xl border border-border bg-surface p-4 text-sm">
        Check <span className="font-medium">{state.email}</span> for a sign-in link.
      </div>
    )
  }

  return (
    <form action={action} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      <label className="block">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="mt-1 block h-12 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent"
        />
      </label>
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-accent-strong">
          {state.message}
        </p>
      )}
      <button disabled={pending} className="h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
        {pending ? 'Sending…' : 'Email me a sign-in link'}
      </button>
    </form>
  )
}
