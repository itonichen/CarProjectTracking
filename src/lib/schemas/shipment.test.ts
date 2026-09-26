import assert from 'node:assert/strict'
import { test } from 'node:test'
import { builderShipmentSchema, trackingUrl } from './shipment'

test('builder shipment needs parts and a date; cost parses to cents', () => {
  const ok = builderShipmentSchema.parse({ slot_ids: ['11111111-1111-4111-8111-111111111111'], shipped_at: '2026-09-26', cost: '$38.50', carrier: ' UPS ' })
  assert.equal(ok.cost, 3850)
  assert.equal(ok.carrier, 'UPS')
  assert.equal(ok.tracking_number, null)
  assert.equal(builderShipmentSchema.safeParse({ slot_ids: [], shipped_at: '2026-09-26' }).success, false)
})

test('tracking links for known carriers only', () => {
  assert.equal(trackingUrl('UPS', '1Z 999'), 'https://www.ups.com/track?tracknum=1Z999')
  assert.equal(trackingUrl('Greyhound', '123'), null)
  assert.equal(trackingUrl('FedEx', null), null)
})
