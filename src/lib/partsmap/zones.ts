// Parts map geometry. Side view (from the design handoff's 3000gt-side.svg) is
// passenger side, front on the right, traced over
// public/partsmap/3000gt-lineart.png (1214×412). Engine bay areas are traced
// over public/partsmap/3000gt-engine-bay.jpg (960×704): hood up, seen from the
// front, radiator at the bottom and firewall at the top. The art shows the
// stock NA engine, so the turbo areas mark where each bank's turbo sits.
// Anchors are where count badges sit (viewBox units).

import type { CarSystem } from '../domain'

export type Shape = { d: string } | { cx: number; cy: number; r: number } | { x: number; y: number; w: number; h: number; rx?: number }

export const ZONE_IDS = [
  'front-end',
  'lighting',
  'engine',
  'wheel-front',
  'cabin',
  'body-side',
  'side-vent',
  'drivetrain',
  'wheel-rear',
  'hatch',
  'rear-end',
] as const
export type ZoneId = (typeof ZONE_IDS)[number]

export type Zone = {
  id: ZoneId
  name: string
  blurb: string
  /** region: large area, tinted on hover. part: small feature, outlined only. */
  kind: 'region' | 'part'
  anchor: [number, number]
  shapes: Shape[]
}

export const SIDE_VIEWBOX = { x: 0, y: 30, width: 1214, height: 340 }
export const LINEART = { href: '/partsmap/3000gt-lineart.png', width: 1214, height: 412 }

// Order matters: later zones draw on top (wheels last, over the body side).
export const ZONES: Zone[] = [
  { id: 'hatch', name: 'Hatch & wing', blurb: '', kind: 'region', anchor: [262, 104], shapes: [{ d: 'M34 72L100 78L186 100L178 126L380 54L384 62L372 138L178 132L140 130L100 110L38 108Z' }] },
  { id: 'cabin', name: 'Interior & electronics', blurb: '', kind: 'region', anchor: [530, 100], shapes: [{ d: 'M384 56L600 60L790 136L700 150L372 140Z' }] },
  { id: 'rear-end', name: 'Rear bumper & exhaust', blurb: '', kind: 'region', anchor: [100, 238], shapes: [{ d: 'M40 132L176 132L174 250L162 324L42 308L36 210Z' }] },
  { id: 'body-side', name: 'Doors & body', blurb: '', kind: 'region', anchor: [590, 242], shapes: [{ d: 'M176 132L372 140L700 150L792 148L806 330L360 332L176 324Z' }] },
  {
    id: 'engine',
    name: 'Engine & turbos',
    blurb: '6G72 3.0 DOHC 24v. NA makes 222 hp; the 1994 VR-4 twin turbo makes 320 hp / 315 lb-ft.',
    kind: 'region',
    anchor: [905, 168],
    shapes: [{ d: 'M790 136L1000 170L1124 208L1036 236L1002 240L1000 332L806 330L792 148Z' }],
  },
  {
    id: 'front-end',
    name: 'Front bumper & aero',
    blurb: '1994 fascia. On the VR-4 the bumper corners feed the side-mount intercoolers.',
    kind: 'region',
    anchor: [1066, 286],
    shapes: [{ d: 'M1002 240L1036 236L1124 208L1150 238L1162 322L1120 332L1000 334Z' }],
  },
  { id: 'lighting', name: 'Lighting', blurb: 'The 1994 refresh swapped pop-ups for fixed projector headlights.', kind: 'part', anchor: [1076, 196], shapes: [{ d: 'M1034 214L1060 208L1118 214L1112 228L1044 232Z' }] },
  { id: 'side-vent', name: 'Side vents', blurb: 'Added in the 1994 refresh along with new bumpers.', kind: 'part', anchor: [402, 222], shapes: [{ d: 'M386 244L414 250L416 298L390 292Z' }] },
  {
    id: 'drivetrain',
    name: 'Driveline',
    blurb: 'NA cars are FWD. The VR-4 adds full-time AWD, 4-wheel steering and a 6-speed Getrag.',
    kind: 'part',
    anchor: [580, 342],
    shapes: [{ d: 'M362 336L800 336L800 346L362 346Z' }],
  },
  { id: 'wheel-rear', name: 'Rear wheels, brakes & suspension', blurb: '', kind: 'region', anchor: [268, 272], shapes: [{ cx: 268, cy: 272, r: 86 }] },
  { id: 'wheel-front', name: 'Front wheels, brakes & suspension', blurb: '', kind: 'region', anchor: [897, 272], shapes: [{ cx: 897, cy: 272, r: 86 }] },
]

export const BAY_IDS = ['radiator', 'intercoolers', 'ic-piping', 'turbo-front', 'turbo-rear', 'intake', 'engine-core', 'transaxle', 'battery'] as const
export type BayId = (typeof BAY_IDS)[number]

export type BayComponent = {
  id: BayId
  name: string
  zone: ZoneId
  anchor: [number, number]
  shapes: Shape[]
}

export const BAY_VIEWBOX = { x: 0, y: 0, width: 960, height: 704 }
export const BAY_LINEART = { href: '/partsmap/3000gt-engine-bay.jpg', width: 960, height: 704 }

export const BAY: BayComponent[] = [
  { id: 'radiator', name: 'Radiator & fans', zone: 'engine', anchor: [500, 628], shapes: [{ x: 205, y: 588, w: 590, h: 78 }] },
  { id: 'intercoolers', name: 'Intercoolers', zone: 'engine', anchor: [130, 618], shapes: [{ x: 55, y: 560, w: 150, h: 115 }, { x: 795, y: 560, w: 150, h: 115 }] },
  {
    id: 'ic-piping',
    name: 'Intercooler piping',
    zone: 'engine',
    anchor: [292, 420],
    shapes: [{ d: 'M232 592L292 592L335 450L405 222L372 178L320 198L250 430Z' }, { d: 'M588 128L650 138L762 298L932 388L926 442L756 382L700 332L582 176Z' }],
  },
  { id: 'intake', name: 'Intake & plenum', zone: 'engine', anchor: [570, 252], shapes: [{ x: 455, y: 172, w: 232, h: 158 }] },
  { id: 'engine-core', name: 'Long block & fuel', zone: 'engine', anchor: [566, 468], shapes: [{ x: 415, y: 330, w: 300, h: 215 }] },
  { id: 'turbo-front', name: 'Front-bank turbo', zone: 'engine', anchor: [392, 562], shapes: [{ cx: 392, cy: 562, r: 36 }] },
  { id: 'turbo-rear', name: 'Rear-bank turbo', zone: 'engine', anchor: [560, 138], shapes: [{ cx: 560, cy: 138, r: 32 }] },
  { id: 'transaxle', name: 'Transaxle', zone: 'drivetrain', anchor: [756, 475], shapes: [{ x: 712, y: 400, w: 88, h: 150 }] },
  { id: 'battery', name: 'Battery', zone: 'engine', anchor: [834, 300], shapes: [{ x: 780, y: 255, w: 108, h: 92 }] },
]

/** Where a hand-added slot (no zone set) shows up. */
export const DEFAULT_ZONE_FOR_SYSTEM: Record<CarSystem, ZoneId> = {
  engine: 'engine',
  conversion: 'engine',
  turbo_intake: 'engine',
  fuel: 'engine',
  cooling: 'engine',
  drivetrain: 'drivetrain',
  suspension_brakes: 'wheel-front',
  electrical: 'cabin',
  body: 'body-side',
  interior: 'cabin',
}

export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]))
export const BAY_BY_ID = new Map(BAY.map((b) => [b.id, b]))

export function zoneOf(slot: { zone: string | null; system: CarSystem }): ZoneId {
  return ZONE_BY_ID.has(slot.zone as ZoneId) ? (slot.zone as ZoneId) : DEFAULT_ZONE_FOR_SYSTEM[slot.system]
}
