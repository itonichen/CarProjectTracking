import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseDollarsToCents } from '../money'
import { newCarSchema } from './car'

test('parses a new car and derives generation and budget cents', () => {
  const car = newCarSchema.parse({ nickname: "Red '94", year: '1995', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT', budget: '$15,000.5', trim: '', builder_id: '' })
  assert.equal(car.generation, 'gen2_1994_96')
  assert.equal(car.budget_cents, 1_500_050)
  assert.equal(car.trim, null)
  assert.equal(car.builder_id, undefined)
})

test('rejects out-of-range years and bad budgets', () => {
  assert.equal(newCarSchema.safeParse({ nickname: 'x', year: '2001', original_engine_variant: '6G72_SOHC', target_engine_variant: '6G72_SOHC' }).success, false)
  assert.equal(newCarSchema.safeParse({ nickname: 'x', year: '1995', original_engine_variant: '6G72_SOHC', target_engine_variant: '6G72_SOHC', budget: 'lots' }).success, false)
})

test('dollars to cents', () => {
  assert.equal(parseDollarsToCents('20'), 2000)
  assert.equal(parseDollarsToCents('1,234.56'), 123456)
  assert.equal(parseDollarsToCents('0.1'), 10)
  assert.equal(parseDollarsToCents('12.345'), null)
  assert.equal(parseDollarsToCents('-5'), null)
})

test('car name: trimmed, required, max 60', async () => {
  const { carNameSchema } = await import('./car')
  const id = '11111111-1111-4111-8111-111111111111'
  assert.equal(carNameSchema.parse({ id, nickname: "  Dad's 3000 GT " }).nickname, "Dad's 3000 GT")
  assert.equal(carNameSchema.safeParse({ id, nickname: '   ' }).success, false)
  assert.equal(carNameSchema.safeParse({ id, nickname: 'x'.repeat(61) }).success, false)
})
