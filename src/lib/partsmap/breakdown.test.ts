import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSlotRows } from '../templates.apply'
import { breakdown } from './breakdown'
import type { MapSlot } from './stats'

const slots: MapSlot[] = buildSlotRows({ generation: 'gen2_1994_96', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' }).slots.map((s, i) => ({
  id: String(i),
  name: s.name,
  system: s.system,
  zone: s.zone,
  bay: s.bay,
  build_status: i % 3 === 0 ? 'installed' : 'needed',
  status_id: null,
  required_qty: s.required_qty,
  have_qty: 0,
  needs_review: s.needs_review,
}))

test('zone and system views cover the same parts', () => {
  const sum = (g: 'zone' | 'system', k: 'total' | 'built' | 'need' | 'review') => breakdown(slots, new Map(), g).reduce((n, r) => n + r.counts[k], 0)
  for (const k of ['total', 'built', 'need', 'review'] as const) assert.equal(sum('zone', k), sum('system', k), k)
  assert.equal(sum('zone', 'total'), slots.length)
})

test('review parts flag their row', () => {
  const conv = breakdown(slots, new Map(), 'system').find((r) => r.id === 'conversion')
  assert.equal(conv?.flag, '8 to review')
})
