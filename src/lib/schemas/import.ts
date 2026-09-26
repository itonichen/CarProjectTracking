import { z } from 'zod'
import { COST_TYPES, LOCATION_STATUSES, PAYMENT_METHODS, SOURCES } from '../domain'

const cents = z.number().int().positive().max(100_000_000)
const date = z.iso.date()
const text = (max: number) => z.string().trim().max(max).nullable()

/** How an imported payment is assigned: left for later, as a part purchase, or as a car cost. */
const assign = z.discriminatedUnion('as', [
  z.object({ as: z.literal('none') }),
  z.object({ as: z.literal('parts'), car_id: z.uuid() }),
  z.object({ as: z.enum(COST_TYPES), car_id: z.uuid() }),
])

export const importPayloadSchema = z.object({
  kind: z.enum(['sheet', 'venmo', 'paypal', 'bank']),
  filename: z.string().max(200),
  method: z.enum(PAYMENT_METHODS),
  location_status: z.enum(LOCATION_STATUSES),
  payments: z
    .array(
      z.object({
        id: z.uuid(),
        amount_cents: cents,
        paid_at: date,
        counterparty: text(200),
        memo: text(500),
        external_id: text(100),
        raw: z.record(z.string(), z.string()),
        assign,
      }),
    )
    .max(5000),
  purchases: z
    .array(
      z.object({
        id: z.uuid(),
        car_id: z.uuid().nullable(),
        title: z.string().trim().min(1).max(200),
        qty: z.number().int().min(1).max(999),
        source: z.enum(SOURCES),
        seller_name: text(120),
        listing_url: z.url().nullable(),
        price_cents: z.number().int().min(0).max(100_000_000),
        shipping_cents: z.number().int().min(0).max(10_000_000),
        purchased_at: date.nullable(),
        condition: text(120),
        notes: text(2000),
        payment_method: z.enum(PAYMENT_METHODS).nullable(),
      }),
    )
    .max(5000),
})

export type ImportPayload = z.infer<typeof importPayloadSchema>
