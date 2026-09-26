import { PAYMENT_METHODS, SOURCES, type PaymentMethod, type Source } from '../domain'
import type { Mapping } from './fields'

export type Row = Record<string, string>

/** "$1,234.56", "-12", "(12.00)" → signed cents. null when not a number. */
export function parseAmount(raw: string | undefined): number | null {
  if (raw == null) return null
  let s = raw.trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  s = s.replace(/[$,\s]|USD/gi, '')
  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  }
  if (!/^\d+(\.\d+)?$/.test(s)) return null
  const cents = Math.round(Number(s) * 100)
  return negative ? -cents : cents
}

/** MM/DD/YYYY, M/D/YY, YYYY-MM-DD, or anything Date can read → YYYY-MM-DD. */
export function parseDate(raw: string | undefined): string | null {
  const s = raw?.trim()
  if (!s) return null
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s)
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2])
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function iso(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** "Mobile Payment: Jane Doe" → { type: 'Mobile Payment', name: 'Jane Doe' }. */
export function splitTypeAndName(value: string): { type: string | null; name: string } {
  const i = value.indexOf(':')
  if (i <= 0) return { type: null, name: value.trim() }
  return { type: value.slice(0, i).trim(), name: value.slice(i + 1).trim() }
}

/** True when most non-empty values look like "Type: Name". */
export function looksLikeTypeAndName(values: string[]) {
  const filled = values.filter((v) => v.trim())
  return filled.length > 0 && filled.filter((v) => /^[^:]{3,60}:\s+\S/.test(v)).length / filled.length >= 0.6
}

// Statements converted from PDF sometimes pick up a stray page number at the
// end of a name ("Scott Schrinner 6"). Only a single trailing digit is dropped.
export function cleanName(name: string) {
  return name.replace(/\s+\d$/, '').replace(/\s{2,}/g, ' ').trim()
}

const TRANSFER = /\b(withdrawal|deposit|transfer (to|from)|bank transfer|add(ed)? funds|currency conversion)\b/i

/** Finds a USD amount written anywhere in the row, e.g. "175.00 USD X 0.8313". */
export function usdFromRow(row: Row): number | null {
  for (const v of Object.values(row)) {
    const m = /([\d,]+\.\d{2})\s*USD/.exec(v ?? '')
    if (m) return parseAmount(m[1])
  }
  return null
}

export type PaymentPreview = {
  index: number
  include: boolean
  reason: string | null // why it's skipped or flagged
  date: string | null
  amount_cents: number | null // positive, what left the account (incl. fee)
  counterparty: string | null
  memo: string | null
  external_id: string | null
  type: string | null
  raw: Row
}

export function previewPayments(rows: Row[], mapping: Mapping, opts: { splitCounterparty: boolean; existingIds: Set<string> }): PaymentPreview[] {
  const col = (row: Row, field: string) => (mapping[field] ? (row[mapping[field]!] ?? '') : '')
  return rows.map((row, index) => {
    const date = parseDate(col(row, 'date'))
    const signed = parseAmount(col(row, 'amount'))
    const fee = parseAmount(col(row, 'fee')) ?? 0
    const currency = col(row, 'currency').trim().toUpperCase()
    let who = col(row, 'counterparty').trim()
    let type: string | null = null
    if (opts.splitCounterparty && who) ({ type, name: who } = splitTypeAndName(who))
    who = cleanName(who)
    const external_id = col(row, 'external_id').trim() || null
    const label = `${type ?? ''} ${col(row, 'counterparty')} ${col(row, 'memo')}`

    let amount_cents: number | null = signed === null ? null : Math.abs(signed) + Math.abs(fee)
    let include = true
    let reason: string | null = null
    const skip = (why: string) => {
      include = false
      reason ??= why
    }

    if (date === null) skip('No readable date')
    if (TRANSFER.test(label)) skip('Transfer or top-up, not a payment')
    if (signed === null) skip('No readable amount')
    else if (signed > 0) skip('Money in, not a payment')
    else if (signed === 0) skip('Zero amount')
    if (external_id && opts.existingIds.has(external_id)) skip('Already imported')
    if (include && currency && currency !== 'USD') {
      const usd = usdFromRow(row)
      if (usd) {
        amount_cents = Math.abs(usd)
        reason = `${currency} payment; using the USD amount`
      } else {
        skip(`${currency} amount with no USD value; enter it by hand`)
      }
    }
    return { index, include, reason, date, amount_cents, counterparty: who || null, memo: col(row, 'memo').trim() || null, external_id, type, raw: row }
  })
}

const SOURCE_PATTERNS: [RegExp, Source][] = [
  [/ebay/i, 'ebay'],
  [/facebook|\bfb\b|marketplace/i, 'fb_marketplace'],
  [/craigslist|\bcl\b/i, 'craigslist'],
  [/forum|3si|stealth316|club/i, 'forum'],
  [/vendor|rock ?auto|summit|amazon|store|shop|parts/i, 'vendor'],
]

export function parseSource(raw: string): Source {
  const s = raw.trim()
  if ((SOURCES as readonly string[]).includes(s.toLowerCase())) return s.toLowerCase() as Source
  return SOURCE_PATTERNS.find(([re]) => re.test(s))?.[1] ?? 'other'
}

export function parseMethod(raw: string): PaymentMethod | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  if ((PAYMENT_METHODS as readonly string[]).includes(s)) return s as PaymentMethod
  if (/pay ?pal/.test(s)) return 'paypal'
  if (/zelle/.test(s)) return 'zelle'
  if (/venmo/.test(s)) return 'venmo'
  if (/cash/.test(s)) return 'cash'
  if (/card|visa|amex|master/.test(s)) return 'card'
  return 'other'
}

export type PurchasePreview = {
  index: number
  include: boolean
  reason: string | null
  title: string | null
  price_cents: number | null
  shipping_cents: number
  qty: number
  seller: string | null
  source: Source
  purchased_at: string | null
  car_value: string // raw car cell, mapped to a car on screen
  payment_method: PaymentMethod | null
  listing_url: string | null
  condition: string | null
  notes: string | null
  raw: Row
}

export function previewPurchases(rows: Row[], mapping: Mapping): PurchasePreview[] {
  const col = (row: Row, field: string) => (mapping[field] ? (row[mapping[field]!] ?? '') : '').trim()
  return rows.map((row, index) => {
    const title = col(row, 'title') || null
    const price = parseAmount(col(row, 'price'))
    const qty = Number.parseInt(col(row, 'qty'), 10)
    const url = col(row, 'listing_url')
    let include = true
    let reason: string | null = null
    if (!title) {
      include = false
      reason = 'No part name'
    } else if (price === null) {
      include = false
      reason = 'No readable price'
    }
    return {
      index,
      include,
      reason,
      title,
      price_cents: price === null ? null : Math.abs(price),
      shipping_cents: Math.abs(parseAmount(col(row, 'shipping')) ?? 0),
      qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
      seller: col(row, 'seller') || null,
      source: parseSource(col(row, 'source')),
      purchased_at: parseDate(col(row, 'purchased_at')),
      car_value: col(row, 'car'),
      payment_method: parseMethod(col(row, 'payment_method')),
      listing_url: /^https?:\/\//.test(url) ? url : null,
      condition: col(row, 'condition') || null,
      notes: col(row, 'notes') || null,
      raw: row,
    }
  })
}

/** Best guess of which car a cell like "red 94" or "1995 white" refers to. */
export function matchCar<T extends { id: string; nickname: string; year: number }>(value: string, cars: T[]): T | null {
  const v = value.trim().toLowerCase()
  if (!v) return null
  const exact = cars.find((c) => c.nickname.toLowerCase() === v)
  if (exact) return exact
  const words = v.split(/[^a-z0-9]+/).filter(Boolean)
  const scored = cars
    .map((c) => {
      const hay = `${c.nickname} ${c.year} '${String(c.year).slice(2)}`.toLowerCase()
      return { c, score: words.filter((w) => hay.includes(w)).length }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.length && (scored.length === 1 || scored[0].score > scored[1].score) ? scored[0].c : null
}
