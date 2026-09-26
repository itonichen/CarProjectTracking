import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { SlotRow } from './templates.apply'
import { missingSlots } from './templates.sync'

const row = (template_key: string): SlotRow => ({
  system: 'drivetrain',
  subsystem: 'Clutch',
  name: template_key,
  required_qty: 1,
  fitment_notes: null,
  destination: 'car',
  needs_review: false,
  sort_order: 0,
  template_key,
  zone: 'drivetrain',
  bay: null,
})

test('adds only missing slots, ordered after their template neighbour', () => {
  const plan = ['a', 'b', 'new1', 'new2', 'c'].map(row)
  const existing = [
    { template_key: 'a', sort_order: 10 },
    { template_key: 'b', sort_order: 20 },
    { template_key: 'c', sort_order: 30 },
    { template_key: null, sort_order: 25 }, // hand-added slot is left alone
  ]
  const out = missingSlots(plan, existing)
  assert.deepEqual(out.map((s) => [s.template_key, s.sort_order]), [['new1', 21], ['new2', 22]])
})

test('nothing to add when the car is up to date', () => {
  assert.deepEqual(missingSlots(['a'].map(row), [{ template_key: 'a', sort_order: 10 }]), [])
})
