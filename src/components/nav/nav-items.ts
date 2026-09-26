import { BookOpen, Car, CircleDollarSign, FileUp, Settings, ShoppingCart, Truck, type LucideIcon } from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

/** Sidebar order (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { href: '/garage', label: 'Garage', icon: Car },
  { href: '/buy', label: 'Buy list', icon: ShoppingCart },
  { href: '/shipments', label: 'Shipments', icon: Truck },
  { href: '/money', label: 'Money', icon: CircleDollarSign },
  { href: '/library', label: 'Manuals', icon: BookOpen },
  { href: '/import', label: 'Import', icon: FileUp },
  { href: '/settings', label: 'Settings', icon: Settings },
]

/** On phones these live behind "More" in the tab bar. */
export const MORE_HREFS = ['/money', '/library', '/import', '/settings']

export function isActive(pathname: string, href: string) {
  if (href === '/garage') return pathname === '/garage' || pathname.startsWith('/cars') || pathname.startsWith('/slots')
  if (href === '/money') return pathname.startsWith('/money') || pathname.startsWith('/payments')
  return pathname.startsWith(href)
}
