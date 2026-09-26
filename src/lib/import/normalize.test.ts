import assert from 'node:assert/strict'
import { test } from 'node:test'
import { guessMapping } from './fields'
import { cleanName, matchCar, parseAmount, parseDate, parseMethod, parseSource, previewPayments, previewPurchases } from './normalize'

// Same shape as the statement-derived PayPal CSV, with made-up people.
const HEADERS = ['statement', 'date', 'description', 'currency', 'funding_source', 'amount', 'fee', 'total', 'txn_id', 'ref_id', 'fx']
const row = (v: string[]) => Object.fromEntries(HEADERS.map((h, i) => [h, v[i] ?? '']))
const PAYPAL = [
  row(['Aug-2024', '08/11/2024', 'Mobile Payment: Pat Seller', 'USD', '', '-150.00', '0.00', '-150.00', 'AAA1']),
  row(['Aug-2024', '08/12/2024', 'General Credit Card Deposit', 'USD', '', '150.00', '0.00', '150.00', 'AAA2', 'AAA1']),
  row(['Aug-2024', '08/25/2024', 'User Initiated Withdrawal', 'USD', '', '-659.67', '0.00', '-659.67', 'AAA3']),
  row(['Aug-2024', '08/25/2024', 'General Payment: Some Buyer', 'USD', '', '680.00', '-20.33', '659.67', 'AAA4']),
  row(['Feb-2025', '02/02/2025', 'General Payment: Big Seller', 'USD', '', '-3000.00', '-87.30', '-3087.30', 'AAA5']),
  row(['Mar-2026', '03/18/2026', 'Mobile Payment: Model Shop', 'EUR', '', '-145.47', '0.00', '-145.47', 'AAA6', '', '175.00 USD X 0.8313 (Exchange Rate)   145.47']),
  row(['Mar-2026', '03/23/2026', 'Mobile Payment: Sam Parts 6', 'USD', '', '-275.00', '0.00', '-275.00', 'AAA7']),
]

test('guesses the PayPal statement columns', () => {
  const m = guessMapping(HEADERS, 'payments')
  assert.equal(m.date, 'date')
  assert.equal(m.amount, 'amount')
  assert.equal(m.fee, 'fee')
  assert.equal(m.counterparty, 'description')
  assert.equal(m.external_id, 'txn_id')
  assert.equal(m.currency, 'currency')
})

test('keeps outgoing payments, skips money in and transfers, handles fees and EUR', () => {
  const m = guessMapping(HEADERS, 'payments')
  const out = previewPayments(PAYPAL, m, { splitCounterparty: true, existingIds: new Set(['AAA7']) })
  const kept = out.filter((r) => r.include)
  assert.deepEqual(
    kept.map((r) => [r.counterparty, r.amount_cents, r.date]),
    [
      ['Pat Seller', 15000, '2024-08-11'],
      ['Big Seller', 308730, '2025-02-02'],
      ['Model Shop', 17500, '2026-03-18'],
    ],
  )
  assert.equal(out[1].reason, 'Transfer or top-up, not a payment')
  assert.equal(out[2].reason, 'Transfer or top-up, not a payment')
  assert.equal(out[3].reason, 'Money in, not a payment')
  assert.equal(out[6].reason, 'Already imported')
  assert.equal(out[6].counterparty, 'Sam Parts')
  assert.match(out[5].reason!, /USD amount/)
})

test('amount, date and name parsing', () => {
  assert.equal(parseAmount('$1,234.56'), 123456)
  assert.equal(parseAmount('(12.00)'), -1200)
  assert.equal(parseAmount('-0.5'), -50)
  assert.equal(parseAmount('abc'), null)
  assert.equal(parseDate('3/5/26'), '2026-03-05')
  assert.equal(parseDate('2025-11-24'), '2025-11-24')
  assert.equal(parseDate('13/40/2025'), null)
  assert.equal(cleanName('Shop 24'), 'Shop 24')
  assert.equal(cleanName('Jo Smith 6'), 'Jo Smith')
})

test('spreadsheet purchases', () => {
  const headers = ['Date', 'Part', 'Car', 'Price', 'Shipping', 'Seller', 'Where', 'Paid with']
  const m = guessMapping(headers, 'purchases')
  assert.equal(m.title, 'Part')
  assert.equal(m.price, 'Price')
  assert.equal(m.car, 'Car')
  assert.equal(m.source, 'Where')
  assert.equal(m.payment_method, 'Paid with')
  assert.equal(m.purchased_at, 'Date')
  const [p, missing] = previewPurchases(
    [
      { Date: '1/2/2025', Part: 'Turbo pair', Car: 'red 94', Price: '$650', Shipping: '40', Seller: 'Dan', Where: 'forum', 'Paid with': 'Zelle' },
      { Date: '', Part: '', Car: '', Price: '', Shipping: '', Seller: '', Where: '', 'Paid with': '' },
    ],
    m,
  )
  assert.equal(p.price_cents, 65000)
  assert.equal(p.shipping_cents, 4000)
  assert.equal(p.source, 'forum')
  assert.equal(p.payment_method, 'zelle')
  assert.equal(missing.include, false)
})

test('source, method and car matching', () => {
  assert.equal(parseSource('Facebook Marketplace'), 'fb_marketplace')
  assert.equal(parseSource('ebay'), 'ebay')
  assert.equal(parseSource(''), 'other')
  assert.equal(parseMethod('PayPal G&S'), 'paypal')
  const cars = [
    { id: '1', nickname: "Red '94", year: 1994 },
    { id: '2', nickname: "White '95", year: 1995 },
    { id: '3', nickname: "Black '95", year: 1995 },
  ]
  assert.equal(matchCar('red', cars)?.id, '1')
  assert.equal(matchCar("White '95", cars)?.id, '2')
  assert.equal(matchCar('95', cars), null) // ambiguous
})
