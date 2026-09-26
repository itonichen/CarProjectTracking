import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildSlotRows } from '../templates.apply'
import { PARTS_JSON_TO_TEMPLATE, statusesFromPartsJson } from './parts-json'

test('every mapped template key exists for a DOHC NA -> TT car', () => {
  const keys = new Set(buildSlotRows({ generation: 'gen2_1994_96', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' }).slots.map((s) => s.template_key))
  for (const [id, targets] of Object.entries(PARTS_JSON_TO_TEMPLATE)) for (const k of targets) assert.ok(keys.has(k), `${id} -> ${k}`)
})

test('merges least-done and reports unknown parts', () => {
  const { byTemplate, unmapped } = statusesFromPartsJson({
    zones: [
      {
        parts: [
          { id: 'hl-l', name: '', status: 'installed' },
          { id: 'hl-r', name: '', status: 'have' },
          { id: 'rotors-f', name: '', status: 'have' },
          { id: 'mystery', name: '', status: 'needed' },
        ],
      },
    ],
  })
  assert.equal(byTemplate.get('base:headlights'), 'have')
  assert.equal(byTemplate.get('base:front_pads'), 'have')
  assert.deepEqual(unmapped, ['mystery'])
})
