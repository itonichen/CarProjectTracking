import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  back?: { href: string; label: string }
  action?: React.ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/90 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-8 md:pt-8">
      {back && (
        <Link href={back.href} className="-ml-1 mb-1 inline-flex items-center gap-0.5 text-sm text-muted hover:text-text">
          <ChevronLeft aria-hidden size={16} />
          {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
          {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
        </div>
        {action}
      </div>
    </header>
  )
}
