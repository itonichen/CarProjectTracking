import { z } from 'zod'
import { COST_TYPES, PAYMENT_METHODS } from '../domain'
import { parseDollarsToCents } from '../money'

export const dollars = (label: string) =>
  z.string().transform((v, ctx) => {
    const cents = parseDollarsToCents(v ?? '')
    if (cents === null || cents <= 0) {
      ctx.addIssue({ code: 'custom', message: `${label} must be a dollar amount above zero` })
      return z.NEVER
    }
    return cents
  })

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional()

/** Assign part of a payment to a car cost or to a part purchase. */
export const allocationSchema = z.discriminatedUnion('target', [
  z.object({
    target: z.literal('car'),
    payment_id: z.uuid(),
    car_id: z.uuid('Choose a car'),
    cost_type: z.enum(COST_TYPES),
    amount: dollars('Amount'),
  }),
  z.object({
    target: z.literal('acquisition'),
    payment_id: z.uuid(),
    acquisition_id: z.uuid('Choose a purchase'),
    amount: dollars('Amount'),
  }),
])

/** A payment or invoice entered by hand. */
export const newPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: dollars('Amount'),
  paid_at: z.iso.date('Pick a date'),
  counterparty: optionalText(120),
  memo: optionalText(500),
})
