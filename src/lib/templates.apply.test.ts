import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSlotRows } from './templates.apply'

const gen2 = 'gen2_1994_96' as const

test('DOHC NA -> TT gets TT engine, conversion and base systems', () => {
  const { slots, warnings } = buildSlotRows({ generation: gen2, original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' })
  assert.deepEqual(warnings, [])
  const keys = new Set(slots.map((s) => s.template_key))
  assert.ok(keys.has('engine_6G72_DOHC_TT:pistons'))
  assert.ok(keys.has('conversion_TT:turbos'))
  assert.ok(keys.has('base:radiator'))
  assert.ok(keys.has('base:clutch_release_cylinder'))
  assert.ok(keys.has('base:clutch_damper'))
  assert.equal(keys.size, slots.length, 'template keys are unique')
  assert.ok(slots.every((s) => !s.needs_review))
  assert.equal(slots.find((s) => s.template_key === 'engine_6G72_DOHC_TT:valves')?.required_qty, 24)
  assert.equal(slots.find((s) => s.template_key === 'conversion_TT:turbos')?.destination, 'builder')
  assert.equal(slots.find((s) => s.template_key === 'conversion_TT:boost_gauge')?.destination, 'car')
})

test('SOHC -> TT warns and marks every conversion slot for review', () => {
  const { slots, warnings } = buildSlotRows({ generation: gen2, original_engine_variant: '6G72_SOHC', target_engine_variant: '6G72_DOHC_TT' })
  assert.equal(warnings.length, 1)
  const conv = slots.filter((s) => s.system === 'conversion')
  assert.ok(conv.length > 0)
  assert.ok(conv.every((s) => s.needs_review))
  assert.ok(slots.filter((s) => s.system === 'engine').every((s) => !s.needs_review))
})

test('NA target gets placeholder engine marked for review and no conversion', () => {
  const { slots } = buildSlotRows({ generation: gen2, original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_NA' })
  assert.equal(slots.filter((s) => s.system === 'conversion').length, 0)
  assert.ok(slots.filter((s) => s.system === 'engine').every((s) => s.needs_review))
})

test('generation-limited slots take the car generation years', () => {
  const { slots } = buildSlotRows({ generation: 'gen3_1997_99', original_engine_variant: '6G72_DOHC_TT', target_engine_variant: '6G72_DOHC_TT' })
  const lights = slots.find((s) => s.template_key === 'base:headlights')
  assert.equal(lights?.fits_from, 1997)
  assert.equal(lights?.fits_to, 1999)
})

test('slots are ordered by system', () => {
  const { slots } = buildSlotRows({ generation: gen2, original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' })
  assert.equal(slots[0].system, 'engine')
  assert.equal(slots.at(-1)?.system, 'interior')
  const orders = slots.map((s) => s.sort_order)
  assert.deepEqual(orders, [...orders].sort((a, b) => a - b))
})
