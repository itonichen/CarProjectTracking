'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileUp, Settings } from 'lucide-react'
import { NAV_ITEMS, type NavItem } from './nav-items'

function isActive(pathname: string, href: string) {
  if (href === '/garage') return pathname === '/garage' || pathname.startsWith('/cars') || pathname.startsWith('/slots')
  return pathname.startsWith(href)
}

/** Sidebar on md+ screens. */
export function Sidebar() {
  const pathname = usePathname()
  const extra: NavItem[] = [
    { href: '/import', label: 'Import', icon: FileUp },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]
  return (
    <nav aria-label="Main" className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:gap-1 md:border-r md:border-border md:bg-surface md:px-3 md:py-5">
      <div className="px-3 pb-5 text-sm font-semibold tracking-wide text-muted uppercase">Garage</div>
      {[...NAV_ITEMS, ...extra].map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
              active ? 'bg-accent-soft text-accent-strong' : 'text-text hover:bg-surface-2'
            }`}
          >
            <Icon aria-hidden size={18} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

/** Bottom tab bar on phones. */
export function BottomTabs() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <Icon aria-hidden size={22} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
