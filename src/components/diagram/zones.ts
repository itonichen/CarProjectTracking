import type { CarSystem } from '@/lib/domain'
import { WHEELS } from './outlines/types'

/**
 * Zone layout shared by every generation outline. Rect zones are clipped to
 * the outline's shell; fill level rises from the bottom of the rect.
 * 'conversion' overlaps the rear of the engine bay and only shows when the
 * car's original and target engine variants differ.
 */
export type Zone = {
  system: CarSystem
  label: { x: number; y: number }
  short: string
} & ({ kind: 'rect'; x: number; y: number; w: number; h: number } | { kind: 'wheels' })

export const ZONES: Zone[] = [
  { system: 'cooling', kind: 'rect', x: 12, y: 80, w: 32, h: 20, label: { x: 33, y: 99 }, short: 'Cool' },
  { system: 'turbo_intake', kind: 'rect', x: 12, y: 100, w: 69, h: 20, label: { x: 64, y: 112 }, short: 'Intake' },
  { system: 'engine', kind: 'rect', x: 44, y: 64, w: 120, h: 36, label: { x: 84, y: 96 }, short: 'Engine' },
  { system: 'electrical', kind: 'rect', x: 164, y: 38, w: 30, h: 54, label: { x: 181, y: 80 }, short: 'Elec' },
  { system: 'interior', kind: 'rect', x: 194, y: 32, w: 86, h: 60, label: { x: 232, y: 72 }, short: 'Interior' },
  { system: 'drivetrain', kind: 'rect', x: 131, y: 92, w: 142, h: 28, label: { x: 202, y: 108 }, short: 'Drive' },
  { system: 'body', kind: 'rect', x: 280, y: 42, w: 108, h: 42, label: { x: 330, y: 76 }, short: 'Body' },
  { system: 'fuel', kind: 'rect', x: 273, y: 84, w: 115, h: 36, label: { x: 352, y: 104 }, short: 'Fuel' },
  { system: 'suspension_brakes', kind: 'wheels', label: { x: WHEELS[0].cx, y: WHEELS[0].cy + 4 }, short: 'Susp' },
]

export const CONVERSION_ZONE: Zone = {
  system: 'conversion',
  kind: 'rect',
  x: 118,
  y: 70,
  w: 48,
  h: 30,
  label: { x: 145, y: 88 },
  short: 'TT conv',
}
