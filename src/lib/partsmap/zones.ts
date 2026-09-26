// Parts map geometry from the design handoff (3000gt-side.svg and
// 3000gt-engine-bay.svg). Side view is passenger side, front on the right,
// traced over public/partsmap/3000gt-lineart.png (1214×412). Engine bay is top
// down, front at the top. Anchors are where count badges sit (viewBox units).

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
  /** Pipes are drawn as thick strokes rather than filled shapes. */
  stroke?: boolean
  tone: 'part' | 'intake' | 'turbo' | 'battery'
}

export const BAY_VIEWBOX = { x: 0, y: 10, width: 800, height: 560 }

export const BAY: BayComponent[] = [
  { id: 'ic-piping', name: 'Intercooler piping', zone: 'engine', anchor: [470, 140], stroke: true, tone: 'part', shapes: [{ d: 'M183 160C183 214 214 256 246 270M352 166C450 146 560 138 604 160' }] },
  { id: 'radiator', name: 'Radiator & fans', zone: 'engine', anchor: [400, 99], tone: 'part', shapes: [{ x: 230, y: 84, w: 340, h: 30, rx: 5 }] },
  { id: 'intercoolers', name: 'Intercoolers', zone: 'engine', anchor: [183, 128], tone: 'part', shapes: [{ x: 150, y: 96, w: 66, h: 64, rx: 8 }, { x: 584, y: 96, w: 66, h: 64, rx: 8 }] },
  { id: 'engine-core', name: 'Long block & fuel', zone: 'engine', anchor: [395, 223], tone: 'part', shapes: [{ x: 250, y: 196, w: 290, h: 54, rx: 8 }, { x: 250, y: 306, w: 290, h: 54, rx: 8 }] },
  { id: 'intake', name: 'Intake & plenum', zone: 'engine', anchor: [395, 278], tone: 'intake', shapes: [{ x: 262, y: 256, w: 266, h: 44, rx: 6 }, { cx: 246, cy: 278, r: 13 }, { x: 150, y: 330, w: 78, h: 62, rx: 8 }] },
  { id: 'turbo-front', name: 'Front-bank turbo', zone: 'engine', anchor: [330, 168], tone: 'turbo', shapes: [{ cx: 330, cy: 168, r: 22 }] },
  { id: 'turbo-rear', name: 'Rear-bank turbo', zone: 'engine', anchor: [470, 388], tone: 'turbo', shapes: [{ cx: 470, cy: 388, r: 22 }] },
  { id: 'transaxle', name: 'Transaxle', zone: 'drivetrain', anchor: [603, 291], tone: 'part', shapes: [{ x: 556, y: 236, w: 94, h: 110, rx: 12 }] },
  { id: 'battery', name: 'Battery', zone: 'engine', anchor: [555, 443], tone: 'battery', shapes: [{ x: 520, y: 420, w: 70, h: 46, rx: 4 }] },
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
