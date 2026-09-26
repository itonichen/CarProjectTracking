'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type WelcomeState = { error?: string }

export async function createHousehold(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const parsed = z.object({ name: z.string().trim().min(1, 'Give the household a name').max(80) }).safeParse({ name: formData.get('name') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.rpc('create_household', { p_name: parsed.data.name })
  if (error) return { error: error.message }
  redirect('/garage')
}

export async function joinHousehold(_prev: WelcomeState, formData: FormData): Promise<WelcomeState> {
  const parsed = z.object({ code: z.string().trim().toLowerCase().regex(/^[0-9a-f]{12}$/, 'Invite codes are 12 characters') }).safeParse({ code: formData.get('code') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_invite', { p_code: parsed.data.code })
  if (error) return { error: error.message }
  redirect('/garage')
}
