import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WelcomeForms } from './WelcomeForms'

export const metadata: Metadata = { title: 'Welcome' }

export default async function WelcomePage(props: PageProps<'/welcome'>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')
  const { data: householdId } = await supabase.rpc('current_household_id')
  if (householdId) redirect('/garage')

  const { code } = await props.searchParams
  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
      <p className="mt-1 mb-8 text-sm text-muted">Everything you track is shared with one other person in your household.</p>
      <WelcomeForms code={typeof code === 'string' ? code : undefined} />
    </main>
  )
}
