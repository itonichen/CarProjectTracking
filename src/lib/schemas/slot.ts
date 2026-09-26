import { z } from 'zod'
import { BUILD_STATUSES, DESTINATIONS, LOCATION_STATUSES } from '../domain'

const year = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null
    const n = Number(v)
    if (!Number.isInteger(n) || n < 1991 || n > 1999) {
      ctx.addIssue({ code: 'custom', message: 'Years run 1991–1999' })
      return z.NEVER
    }
    return n
  })

export const slotUpdateSchema = z
  .object({
    id: z.uuid(),
    required_qty: z.coerce.number().int().min(1, 'At least 1').max(999),
    destination: z.enum(DESTINATIONS),
    fits_from: year,
    fits_to: year,
    fitment_notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => v || null),
    needs_review: z
      .string()
      .optional()
      .transform((v) => v === 'on'),
  })
  .refine((v) => v.fits_from === null || v.fits_to === null || v.fits_from <= v.fits_to, {
    path: ['fits_to'],
    message: 'End year is before start year',
  })
  .transform(({ fits_from, fits_to, ...rest }) => ({
    ...rest,
    // Postgres int4range literal; inclusive bounds, open ends allowed.
    fits_years: fits_from === null && fits_to === null ? null : `[${fits_from ?? ''},${fits_to ?? ''}]`,
  }))

export const buildStatusSchema = z.object({ id: z.uuid(), build_status: z.enum(BUILD_STATUSES) })
export const locationSchema = z.object({ id: z.uuid(), slot_id: z.uuid(), location_status: z.enum(LOCATION_STATUSES) })
