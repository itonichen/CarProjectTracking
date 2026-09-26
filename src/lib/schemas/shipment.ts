import { z } from 'zod'
import { parseDollarsToCents } from '../money'

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null)

export const builderShipmentSchema = z.object({
  slot_ids: z.array(z.uuid()).min(1, 'Pick at least one part').max(500),
  carrier: text(40),
  tracking_number: text(60),
  to_label: text(80),
  shipped_at: z.iso.date('Pick a date'),
  cost: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) return 0
      const cents = parseDollarsToCents(v)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: 'Cost must be a dollar amount' })
        return z.NEVER
      }
      return cents
    }),
  notes: text(500),
})

/** A public tracking page for the big carriers. Not live tracking; just a link. */
export function trackingUrl(carrier: string | null, number: string | null): string | null {
  if (!carrier || !number) return null
  const n = encodeURIComponent(number.replace(/\s+/g, ''))
  const c = carrier.toLowerCase()
  if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${n}`
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${n}`
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`
  if (c.includes('dhl')) return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${n}`
  return null
}
