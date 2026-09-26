import assert from 'node:assert/strict'
import { test } from 'node:test'
import { defaultLocationFor, quickAddSchema } from './acquisition'

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Head gaskets',
  price: '219',
  source: 'ebay',
  location_status: 'in_transit_to_us',
  payment_method: '',
}

test('minimal quick add', () => {
  const v = quickAddSchema.parse(base)
  assert.equal(v.price, 21900)
  assert.equal(v.shipping, 0)
  assert.equal(v.qty, 1)
  assert.equal(v.payment_method, null)
  assert.equal(v.car_id, null)
})

test('price is required, slot needs a car', () => {
  assert.equal(quickAddSchema.safeParse({ ...base, price: '' }).success, false)
  assert.equal(quickAddSchema.safeParse({ ...base, slot_id: '22222222-2222-4222-8222-222222222222' }).success, false)
})

test('bad listing url is dropped, not fatal', () => {
  assert.equal(quickAddSchema.parse({ ...base, listing_url: 'not a url' }).listing_url, null)
})

test('local pickups default to at home', () => {
  assert.equal(defaultLocationFor('craigslist'), 'at_home')
  assert.equal(defaultLocationFor('ebay'), 'in_transit_to_us')
})
