import { SYSTEM_LABELS, type CarSystem } from './domain'
import { BASE_SYSTEMS, CONVERSION_TT, ENGINE_TEMPLATES, type Template } from './templates'

export type SlotType = { key: string; name: string; system: CarSystem; template: string }

const ALL: Template[] = [...Object.values(ENGINE_TEMPLATES), CONVERSION_TT, BASE_SYSTEMS]

/** Every slot type any template can create, keyed by part_slots.template_key. */
export const SLOT_TYPES: SlotType[] = ALL.flatMap((t) =>
  t.slots.map((s) => ({ key: `${t.key}:${s.key}`, name: s.name, system: s.system, template: t.label })),
)

const BY_KEY = new Map(SLOT_TYPES.map((s) => [s.key, s]))

export function slotTypeLabel(key: string) {
  const s = BY_KEY.get(key)
  return s ? `${s.name} (${SYSTEM_LABELS[s.system]}, ${s.template})` : key
}
