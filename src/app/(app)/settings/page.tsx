import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { PageHeader } from '@/components/ui/PageHeader'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { requireHousehold } from '@/lib/session'
import { THEME_COOKIE, parseTheme } from '@/lib/theme'
import { createInvite } from './actions'

export const metadata: Metadata = { title: 'Settings' }

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

export default async function SettingsPage() {
  const { supabase, householdId } = await requireHousehold()
  const [household, invites, jar, h] = await Promise.all([
    supabase.from('households').select('name').eq('id', householdId).single(),
    supabase.from('household_invites').select('code, expires_at').is('used_at', null).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(3),
    cookies(),
    headers(),
  ])
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`

  return (
    <div>
      <PageHeader title="Settings" />
      <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-4">
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-semibold">Appearance</h2>
          <div className="mt-3">
            <ThemeToggle initial={parseTheme(jar.get(THEME_COOKIE)?.value)} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="font-semibold">{household.data?.name ?? 'Household'}</h2>
          <p className="mt-1 text-sm text-muted">Invite the other person so you both see and edit the same cars, parts and money. Codes work once and expire after a week.</p>
          {(invites.data ?? []).length > 0 && (
            <ul className="mt-3 space-y-2">
              {invites.data!.map((i) => (
                <li key={i.code} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <span className="font-mono text-base tracking-wider">{i.code}</span>
                  <span className="block text-xs break-all text-muted">
                    {origin}/welcome?code={i.code} · expires {dateFmt.format(new Date(i.expires_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <form action={createInvite} className="mt-3">
            <button className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white">New invite code</button>
          </form>
        </section>
      </div>
    </div>
  )
}
