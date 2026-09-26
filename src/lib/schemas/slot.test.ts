import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slotUpdateSchema } from './slot'

const id = '11111111-1111-4111-8111-111111111111'

test('year range becomes an inclusive int4range literal', () => {
  const v = slotUpdateSchema.parse({ id, required_qty: '2', destination: 'car', fits_from: '1994', fits_to: '1996' })
  assert.equal(v.fits_years, '[1994,1996]')
  assert.equal(v.needs_review, false)
})

test('open-ended and empty ranges', () => {
  assert.equal(slotUpdateSchema.parse({ id, required_qty: '1', destination: 'car', fits_from: '1997' }).fits_years, '[1997,]')
  assert.equal(slotUpdateSchema.parse({ id, required_qty: '1', destination: 'builder', needs_review: 'on' }).fits_years, null)
})

test('rejects reversed or out-of-range years', () => {
  assert.equal(slotUpdateSchema.safeParse({ id, required_qty: '1', destination: 'car', fits_from: '1996', fits_to: '1994' }).success, false)
  assert.equal(slotUpdateSchema.safeParse({ id, required_qty: '1', destination: 'car', fits_from: '2001' }).success, false)
})
