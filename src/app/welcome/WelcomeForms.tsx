'use client'

import { useActionState } from 'react'
import { createHousehold, joinHousehold, type WelcomeState } from './actions'

const input = 'mt-1 block h-12 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent'

export function WelcomeForms({ code }: { code?: string }) {
  const [createState, create, creating] = useActionState<WelcomeState, FormData>(createHousehold, {})
  const [joinState, join, joining] = useActionState<WelcomeState, FormData>(joinHousehold, {})

  return (
    <div className="space-y-8">
      <form action={join} className="space-y-3">
        <h2 className="font-semibold">Join with an invite code</h2>
        <label className="block">
          <span className="text-sm text-muted">Code from the other person’s Settings page</span>
          <input name="code" defaultValue={code} autoCapitalize="none" autoComplete="off" className={input} />
        </label>
        {joinState.error && <p role="alert" className="text-sm text-accent-strong">{joinState.error}</p>}
        <button disabled={joining} className="h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
          Join household
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={create} className="space-y-3">
        <h2 className="font-semibold">Start a new household</h2>
        <label className="block">
          <span className="text-sm text-muted">Name</span>
          <input name="name" defaultValue="Our garage" className={input} />
        </label>
        {createState.error && <p role="alert" className="text-sm text-accent-strong">{createState.error}</p>}
        <button disabled={creating} className="h-12 w-full rounded-xl border border-border bg-surface font-semibold disabled:opacity-60">
          Create household
        </button>
      </form>
    </div>
  )
}
