import { BookOpen, Car, CircleDollarSign, ShoppingCart, Truck, type LucideIcon } from 'lucide-react'

export type NavItem = { href: string; label: string; icon: LucideIcon }

export const NAV_ITEMS: NavItem[] = [
  { href: '/garage', label: 'Garage', icon: Car },
  { href: '/buy', label: 'Buy list', icon: ShoppingCart },
  { href: '/shipments', label: 'Shipments', icon: Truck },
  { href: '/money', label: 'Money', icon: CircleDollarSign },
  { href: '/library', label: 'Manuals', icon: BookOpen },
]
