'use server'

import { revalidatePath } from 'next/cache'
import { requireHousehold } from '@/lib/session'

export async function createInvite() {
  const { supabase, householdId, userId } = await requireHousehold()
  await supabase.from('household_invites').insert({ household_id: householdId, created_by: userId })
  revalidatePath('/settings')
}
