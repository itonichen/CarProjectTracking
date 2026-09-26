'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  email: z.email('Enter a valid email address'),
  next: z.string().startsWith('/').optional().catch(undefined),
})

export type LoginState = { status: 'idle' | 'sent' | 'error'; message?: string; email?: string }

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: formData.get('email'), next: formData.get('next') || undefined })
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0].message }

  const h = await headers()
  const origin = h.get('origin') ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
  const redirect = new URL('/auth/callback', origin)
  if (parsed.data.next) redirect.searchParams.set('next', parsed.data.next)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirect.toString() },
  })
  if (error) return { status: 'error', message: error.message }
  return { status: 'sent', email: parsed.data.email }
}
