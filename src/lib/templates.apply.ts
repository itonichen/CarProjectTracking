import { GENERATION_INFO, SYSTEMS, type CarSystem, type Destination, type EngineVariant, type Generation } from './domain'
import { BASE_SYSTEMS, CONVERSION_TT, ENGINE_TEMPLATES, type Template } from './templates'

/** One part_slots row as create_car_with_slots expects it. */
export type SlotRow = {
  system: CarSystem
  subsystem: string | null
  name: string
  required_qty: number
  fitment_notes: string | null
  fits_from?: number
  fits_to?: number
  destination: Destination
  needs_review: boolean
  sort_order: number
  template_key: string
}

export type TemplatePlan = {
  templates: { template: Template; forceReview: boolean }[]
  warnings: string[]
}

type CarShape = {
  generation: Generation
  original_engine_variant: EngineVariant
  target_engine_variant: EngineVariant
}

/** Decide which templates apply to a car, and what to warn about. */
export function planTemplates(car: CarShape): TemplatePlan {
  const { original_engine_variant: from, target_engine_variant: to } = car
  const templates: TemplatePlan['templates'] = [{ template: ENGINE_TEMPLATES[to], forceReview: false }]
  const warnings: string[] = []

  if (to === '6G72_DOHC_TT' && from === '6G72_DOHC_NA') {
    templates.push({ template: CONVERSION_TT, forceReview: false })
  } else if (to === '6G72_DOHC_TT' && from === '6G72_SOHC') {
    warnings.push(
      'SOHC to DOHC twin turbo is not a bolt-on conversion: it needs a different engine. ' +
        'Conversion parts were added but every one is marked for review.',
    )
    templates.push({ template: CONVERSION_TT, forceReview: true })
  } else if (from !== to) {
    warnings.push(`No conversion template for ${from} → ${to}. Add conversion parts by hand.`)
  }

  templates.push({ template: BASE_SYSTEMS, forceReview: false })
  return { templates, warnings }
}

/** Expand the planned templates into slot rows for a new car. */
export function buildSlotRows(car: CarShape): { slots: SlotRow[]; warnings: string[] } {
  const { templates, warnings } = planTemplates(car)
  const [genFrom, genTo] = GENERATION_INFO[car.generation].years
  const slots: SlotRow[] = []

  for (const { template, forceReview } of templates) {
    for (const s of template.slots) {
      const range = s.fits === 'generation' ? [genFrom, genTo] : s.fits
      slots.push({
        system: s.system,
        subsystem: s.subsystem ?? null,
        name: s.name,
        required_qty: s.qty,
        fitment_notes: s.notes ?? null,
        ...(range ? { fits_from: range[0], fits_to: range[1] } : {}),
        destination: s.dest,
        needs_review: Boolean(forceReview || template.review || s.review),
        sort_order: 0,
        template_key: `${template.key}:${s.key}`,
      })
    }
  }

  // Order by system (fixed enum order), then template order within it.
  const systemIndex = (s: CarSystem) => SYSTEMS.indexOf(s)
  slots
    .map((s, i) => ({ s, i }))
    .sort((a, b) => systemIndex(a.s.system) - systemIndex(b.s.system) || a.i - b.i)
    .forEach(({ s }, i) => (s.sort_order = (i + 1) * 10))
  slots.sort((a, b) => a.sort_order - b.sort_order)

  return { slots, warnings }
}
