import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'Sign in' }

export default async function LoginPage(props: PageProps<'/login'>) {
  const { next, error } = await props.searchParams
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Garage</h1>
      <p className="mt-1 mb-6 text-sm text-muted">Parts, money and progress on the 3000GT builds.</p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-strong">
          That sign-in link didn’t work. Request a new one.
        </p>
      )}
      <LoginForm next={typeof next === 'string' ? next : undefined} />
    </main>
  )
}
