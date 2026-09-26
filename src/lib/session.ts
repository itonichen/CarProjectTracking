import 'server-only'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { createClient } from './supabase/server'

/** The signed-in user and their household. Redirects if either is missing. */
export const requireHousehold = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect('/login')

  const { data: householdId } = await supabase.rpc('current_household_id')
  if (!householdId) redirect('/welcome')

  return { supabase, userId: data.claims.sub as string, householdId: householdId as string }
})
