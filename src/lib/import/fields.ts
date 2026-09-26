// Import targets and the header names we guess them from. Guesses only
// propose a mapping; the user can change every column on the import screen.

export type ImportMode = 'payments' | 'purchases'

export const PAYMENT_FIELDS = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'fee', label: 'Fee', required: false },
  { key: 'counterparty', label: 'Paid to', required: false },
  { key: 'memo', label: 'Memo / note', required: false },
  { key: 'external_id', label: 'Transaction ID', required: false },
  { key: 'currency', label: 'Currency', required: false },
] as const

export const PURCHASE_FIELDS = [
  { key: 'title', label: 'Part / item', required: true },
  { key: 'price', label: 'Price', required: true },
  { key: 'shipping', label: 'Shipping', required: false },
  { key: 'qty', label: 'Quantity', required: false },
  { key: 'seller', label: 'Seller', required: false },
  { key: 'source', label: 'Bought on (eBay, FB…)', required: false },
  { key: 'purchased_at', label: 'Date', required: false },
  { key: 'car', label: 'Car', required: false },
  { key: 'payment_method', label: 'Paid with', required: false },
  { key: 'listing_url', label: 'Listing link', required: false },
  { key: 'condition', label: 'Condition', required: false },
  { key: 'notes', label: 'Notes', required: false },
] as const

export type PaymentField = (typeof PAYMENT_FIELDS)[number]['key']
export type PurchaseField = (typeof PURCHASE_FIELDS)[number]['key']
export type Mapping = Record<string, string | null> // field key -> CSV header

// Ordered: earlier patterns win when several headers match.
const SYNONYMS: Record<PaymentField | PurchaseField, RegExp[]> = {
  date: [/^date$/, /transaction date|posted|paid.?(on|at|date)|^when$/, /date/],
  amount: [/^amount$/, /^gross$/, /amount|^total$|^net$/],
  fee: [/^fees?$/],
  counterparty: [/^name$/, /payee|counterparty|paid to|^to$|recipient|merchant/, /^description$/],
  memo: [/^note$|^memo$|message|subject|item title/],
  external_id: [/transaction.?id|txn.?id|^id$/, /reference|ref.?id/],
  currency: [/^currency$/],
  title: [/^(part|item)( name)?$/, /^title$|^description$|^what$/, /part|item/],
  price: [/^price$|^cost$/, /price|cost|^amount$/],
  shipping: [/ship/],
  qty: [/^qty$|quantity|^count$/],
  seller: [/seller|vendor|^from$|bought from|sold by/],
  source: [/source|platform|site|where|marketplace/],
  purchased_at: [/^date$/, /purchased|bought|order date|date/],
  car: [/^car$|vehicle|^for$|which car/],
  payment_method: [/paid with|payment|method|paid by/],
  listing_url: [/url|link|listing/],
  condition: [/condition/],
  notes: [/^notes?$|comment/],
}

const norm = (h: string) => h.trim().toLowerCase().replace(/[_-]+/g, ' ')

/** Propose a column for each field. A header is used at most once. */
export function guessMapping(headers: string[], mode: ImportMode): Mapping {
  const fields = (mode === 'payments' ? PAYMENT_FIELDS : PURCHASE_FIELDS).map((f) => f.key)
  const used = new Set<string>()
  const mapping: Mapping = {}
  // Try the strongest pattern for every field before weaker ones.
  const maxDepth = Math.max(...fields.map((f) => SYNONYMS[f].length))
  for (let depth = 0; depth < maxDepth; depth++) {
    for (const field of fields) {
      if (mapping[field]) continue
      const re = SYNONYMS[field][depth]
      if (!re) continue
      const hit = headers.find((h) => !used.has(h) && re.test(norm(h)))
      if (hit) {
        mapping[field] = hit
        used.add(hit)
      }
    }
  }
  for (const field of fields) mapping[field] ??= null
  return mapping
}
