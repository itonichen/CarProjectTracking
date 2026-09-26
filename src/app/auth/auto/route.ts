import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { devAutoLoginEmail } from '@/lib/dev-auto-login'

// Development only: signs in as DEV_AUTO_LOGIN_EMAIL without a login screen.
// Mints a magic-link token with the admin API and redeems it right away, so
// the session is a normal Supabase session and RLS still applies.
export async function GET(request: NextRequest) {
  const email = devAutoLoginEmail()
  if (!email) return new NextResponse('Not found', { status: 404 })

  const nextParam = request.nextUrl.searchParams.get('next')
  const next = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/garage'

  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  if (error) return new NextResponse(`Auto sign-in failed: ${error.message}. Did you run npm run seed?`, { status: 500 })

  const supabase = await createClient()
  const verified = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: data.properties.hashed_token })
  if (verified.error) return new NextResponse(`Auto sign-in failed: ${verified.error.message}`, { status: 500 })

  return NextResponse.redirect(new URL(next, request.nextUrl.origin))
}
