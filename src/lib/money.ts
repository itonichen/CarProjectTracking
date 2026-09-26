const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const usdWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

/** Format integer cents as dollars. */
export function formatCents(cents: number | null | undefined, opts: { whole?: boolean } = {}) {
  const n = (cents ?? 0) / 100
  return (opts.whole ? usdWhole : usd).format(n)
}

/** Parse user-entered dollars ("1,234.5", "$20") into integer cents. Returns null if invalid. */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '')
  if (cleaned === '') return null
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null
  const [whole, frac = ''] = cleaned.split('.')
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'))
}
