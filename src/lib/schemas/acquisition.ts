import { z } from 'zod'
import { LOCATION_STATUSES, PAYMENT_METHODS, SOURCES } from '../domain'
import { parseDollarsToCents } from '../money'

const money = (label: string, { required }: { required: boolean }) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v?.trim()) {
        if (required) ctx.addIssue({ code: 'custom', message: `Enter the ${label}` })
        return 0
      }
      const cents = parseDollarsToCents(v)
      if (cents === null) {
        ctx.addIssue({ code: 'custom', message: `${label[0].toUpperCase()}${label.slice(1)} must be a dollar amount` })
        return z.NEVER
      }
      return cents
    })

const blankToNull = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)

export const quickAddSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, 'What did you buy?').max(200),
  price: money('price', { required: true }),
  shipping: money('shipping', { required: false }),
  qty: z.coerce.number().int().min(1).max(999).default(1),
  seller_name: blankToNull.pipe(z.string().max(120).nullable()),
  source: z.enum(SOURCES),
  car_id: blankToNull.pipe(z.uuid().nullable()),
  slot_id: blankToNull.pipe(z.uuid().nullable()),
  location_status: z.enum(LOCATION_STATUSES),
  // '' means "not paid yet"
  payment_method: z.enum(PAYMENT_METHODS).or(z.literal('').transform(() => null)),
  photo_path: blankToNull,
  listing_url: blankToNull.pipe(z.url().nullable().catch(null)),
})
  .refine((v) => !v.slot_id || v.car_id, { path: ['slot_id'], message: 'Pick the car for this slot' })

export type QuickAddInput = z.input<typeof quickAddSchema>

/** Local pickups are usually already home; everything else ships. */
export function defaultLocationFor(source: string) {
  return source === 'fb_marketplace' || source === 'craigslist' ? 'at_home' : 'in_transit_to_us'
}
