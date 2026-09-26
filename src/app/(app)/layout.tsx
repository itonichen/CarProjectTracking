import { cookies } from 'next/headers'
import { BottomTabs, Sidebar } from '@/components/nav/AppNav'
import { QuickAddProvider } from '@/components/quick-add/QuickAddProvider'
import { THEME_COOKIE, parseTheme } from '@/lib/theme'

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <QuickAddProvider>
      <div className="flex min-h-dvh">
        <Sidebar theme={theme} />
        <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8">{children}</main>
        <BottomTabs />
      </div>
    </QuickAddProvider>
  )
}
