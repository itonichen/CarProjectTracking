import { BottomTabs, Sidebar } from '@/components/nav/AppNav'

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">{children}</main>
      <BottomTabs />
    </div>
  )
}
