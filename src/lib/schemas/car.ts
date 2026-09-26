import { z } from 'zod'
import { ENGINE_VARIANTS, generationForYear } from '../domain'
import { parseDollarsToCents } from '../money'

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional()

export const newCarSchema = z
  .object({
    nickname: z.string().trim().min(1, 'Give the car a nickname').max(60),
    year: z.coerce.number().int().min(1991, '3000GTs were built 1991–1999').max(1999, '3000GTs were built 1991–1999'),
    trim: optionalText(40),
    original_engine_variant: z.enum(ENGINE_VARIANTS),
    target_engine_variant: z.enum(ENGINE_VARIANTS),
    drivetrain: optionalText(20),
    color: optionalText(40),
    vin: optionalText(17),
    budget: z
      .string()
      .optional()
      .transform((v, ctx) => {
        if (!v?.trim()) return 0
        const cents = parseDollarsToCents(v)
        if (cents === null) {
          ctx.addIssue({ code: 'custom', message: 'Budget must be a dollar amount' })
          return z.NEVER
        }
        return cents
      }),
    builder_id: z.uuid().optional().or(z.literal('').transform(() => undefined)),
    notes: optionalText(2000),
  })
  .transform(({ budget, ...car }) => ({ ...car, budget_cents: budget, generation: generationForYear(car.year)! }))

export type NewCarInput = z.input<typeof newCarSchema>

/** The fields editable straight from a garage card. */
export const carBasicsSchema = z.object({
  id: z.uuid(),
  nickname: z.string().trim().min(1, 'Name can’t be empty').max(60),
  trim: optionalText(40),
  color: optionalText(40),
})
