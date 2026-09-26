import assert from 'node:assert/strict'
import { test } from 'node:test'
import { allocationSchema, newPaymentSchema } from './payment'

const pid = '11111111-1111-4111-8111-111111111111'
const cid = '22222222-2222-4222-8222-222222222222'

test('car allocation needs a cost type and a positive amount', () => {
  const ok = allocationSchema.parse({ target: 'car', payment_id: pid, car_id: cid, cost_type: 'labor', amount: '1,500' })
  assert.equal(ok.target === 'car' && ok.amount, 150000)
  assert.equal(allocationSchema.safeParse({ target: 'car', payment_id: pid, car_id: cid, amount: '10' }).success, false)
  assert.equal(allocationSchema.safeParse({ target: 'car', payment_id: pid, car_id: cid, cost_type: 'labor', amount: '0' }).success, false)
})

test('acquisition allocation needs an acquisition', () => {
  assert.equal(allocationSchema.safeParse({ target: 'acquisition', payment_id: pid, amount: '10' }).success, false)
})

test('manual payment', () => {
  const p = newPaymentSchema.parse({ method: 'zelle', amount: '2500', paid_at: '2026-09-01', counterparty: 'Builder', memo: '' })
  assert.equal(p.amount, 250000)
  assert.equal(p.memo, null)
})
