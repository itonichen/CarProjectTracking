// Enum values mirror supabase/migrations/20260926000001_enums.sql.

export const GENERATIONS = ['gen1_1991_93', 'gen2_1994_96', 'gen3_1997_99'] as const
export type Generation = (typeof GENERATIONS)[number]

export const GENERATION_INFO: Record<Generation, { label: string; short: string; years: [number, number]; look: string }> = {
  gen1_1991_93: { label: '1st gen (1991–93)', short: 'Gen 1', years: [1991, 1993], look: 'Pop-up headlights' },
  gen2_1994_96: { label: '2nd gen (1994–96)', short: 'Gen 2', years: [1994, 1996], look: 'Fixed projector headlights' },
  gen3_1997_99: { label: '3rd gen (1997–99)', short: 'Gen 3', years: [1997, 1999], look: 'Revised bumper, larger wing' },
}

export function generationForYear(year: number): Generation | null {
  for (const g of GENERATIONS) {
    const [from, to] = GENERATION_INFO[g].years
    if (year >= from && year <= to) return g
  }
  return null
}

export const ENGINE_VARIANTS = ['6G72_SOHC', '6G72_DOHC_NA', '6G72_DOHC_TT'] as const
export type EngineVariant = (typeof ENGINE_VARIANTS)[number]

export const ENGINE_LABELS: Record<EngineVariant, string> = {
  '6G72_SOHC': 'SOHC 12v',
  '6G72_DOHC_NA': 'DOHC NA',
  '6G72_DOHC_TT': 'DOHC Twin Turbo',
}

export const SYSTEMS = [
  'engine',
  'conversion',
  'turbo_intake',
  'fuel',
  'cooling',
  'drivetrain',
  'suspension_brakes',
  'electrical',
  'body',
  'interior',
] as const
export type CarSystem = (typeof SYSTEMS)[number]

export const SYSTEM_LABELS: Record<CarSystem, string> = {
  engine: 'Engine',
  conversion: 'TT conversion',
  turbo_intake: 'Turbo & intake',
  fuel: 'Fuel',
  cooling: 'Cooling',
  drivetrain: 'Drivetrain',
  suspension_brakes: 'Suspension & brakes',
  electrical: 'Electrical',
  body: 'Body',
  interior: 'Interior',
}

export const DESTINATIONS = ['builder', 'car'] as const
export type Destination = (typeof DESTINATIONS)[number]

export const BUILD_STATUSES = ['needed', 'sourcing', 'have', 'installed'] as const
export type BuildStatus = (typeof BUILD_STATUSES)[number]

export const LOCATION_STATUSES = [
  'with_seller',
  'in_transit_to_us',
  'at_home',
  'in_transit_to_builder',
  'at_builder',
  'installed',
  'returned',
  'sold',
] as const
export type LocationStatus = (typeof LOCATION_STATUSES)[number]

export const LOCATION_LABELS: Record<LocationStatus, string> = {
  with_seller: 'With seller',
  in_transit_to_us: 'Shipping to us',
  at_home: 'At home',
  in_transit_to_builder: 'Shipping to builder',
  at_builder: 'At builder',
  installed: 'Installed',
  returned: 'Returned',
  sold: 'Sold',
}

export const SOURCES = ['ebay', 'fb_marketplace', 'craigslist', 'forum', 'vendor', 'other'] as const
export type Source = (typeof SOURCES)[number]

export const SOURCE_LABELS: Record<Source, string> = {
  ebay: 'eBay',
  fb_marketplace: 'FB Marketplace',
  craigslist: 'Craigslist',
  forum: 'Forum',
  vendor: 'Vendor',
  other: 'Other',
}

export const PAYMENT_METHODS = ['zelle', 'paypal', 'venmo', 'cash', 'card', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  zelle: 'Zelle',
  paypal: 'PayPal',
  venmo: 'Venmo',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
}

/** A year range from Postgres int4range text, e.g. "[1994,1997)". Upper bound is inclusive here. */
export type YearRange = { from: number | null; to: number | null }

export function parseYearRange(value: string | null | undefined): YearRange | null {
  if (!value || value === 'empty') return null
  const m = /^([[(])(\d*),(\d*)([\])])$/.exec(value)
  if (!m) return null
  const from = m[2] ? Number(m[2]) + (m[1] === '(' ? 1 : 0) : null
  const to = m[3] ? Number(m[3]) - (m[4] === ')' ? 1 : 0) : null
  return { from, to }
}

export function formatYearRange(r: YearRange | null): string {
  if (!r || (r.from === null && r.to === null)) return 'Any year'
  if (r.from === r.to) return String(r.from)
  return `${r.from ?? '…'}–${r.to ?? '…'}`
}

export function yearFits(year: number, r: YearRange | null): boolean {
  if (!r) return true
  return (r.from === null || year >= r.from) && (r.to === null || year <= r.to)
}
