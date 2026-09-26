'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import Papa from 'papaparse'
import { Check, FileUp, TriangleAlert } from 'lucide-react'
import {
  COST_TYPES,
  COST_TYPE_LABELS,
  LOCATION_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type CostType,
  type LocationStatus,
  type PaymentMethod,
} from '@/lib/domain'
import { PAYMENT_FIELDS, PURCHASE_FIELDS, guessMapping, type ImportMode, type Mapping } from '@/lib/import/fields'
import { looksLikeTypeAndName, matchCar, previewPayments, previewPurchases, type Row } from '@/lib/import/normalize'
import { formatCents } from '@/lib/money'
import type { ImportPayload } from '@/lib/schemas/import'
import { commitImport, type CommitResult } from './actions'

type Car = { id: string; nickname: string; year: number }
type Kind = ImportPayload['kind']
type Parsed = { name: string; headers: string[]; rows: Row[] }
/** 'none' or `${as}|${carId}` where as is 'parts' or a cost type. */
type AssignValue = string

const KINDS: { value: Kind; label: string; method: PaymentMethod }[] = [
  { value: 'paypal', label: 'PayPal', method: 'paypal' },
  { value: 'venmo', label: 'Venmo', method: 'venmo' },
  { value: 'bank', label: 'Bank / Zelle', method: 'zelle' },
  { value: 'sheet', label: 'Spreadsheet', method: 'other' },
]

const PREVIEW_ROWS = 20
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
const field = 'h-10 w-full rounded-lg border border-border bg-bg px-2 text-sm'

function guessKind(filename: string, mode: ImportMode): Kind {
  const f = filename.toLowerCase()
  if (f.includes('paypal')) return 'paypal'
  if (f.includes('venmo')) return 'venmo'
  return mode === 'payments' ? 'bank' : 'sheet'
}

export function ImportWizard({ cars, existingIds }: { cars: Car[]; existingIds: string[] }) {
  const [file, setFile] = useState<Parsed | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [mode, setMode] = useState<ImportMode>('payments')
  const [kind, setKind] = useState<Kind>('paypal')
  const [method, setMethod] = useState<PaymentMethod>('paypal')
  const [mapping, setMapping] = useState<Mapping>({})
  const [split, setSplit] = useState(false)
  const [location, setLocation] = useState<LocationStatus>('at_home')
  const [include, setInclude] = useState<Record<number, boolean>>({})
  const [assign, setAssign] = useState<Record<number, AssignValue>>({})
  const [carForValue, setCarForValue] = useState<Record<string, string>>({})
  const [carForRow, setCarForRow] = useState<Record<number, string>>({})
  const [showAll, setShowAll] = useState(false)
  const [result, setResult] = useState<CommitResult | null>(null)
  const [pending, startTransition] = useTransition()

  function load(f: File) {
    setResult(null)
    setParseError(null)
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: ({ data, meta, errors }) => {
        const headers = (meta.fields ?? []).filter(Boolean)
        if (!headers.length || !data.length) {
          setParseError(errors[0]?.message ?? 'That file has no rows.')
          return
        }
        const payMap = guessMapping(headers, 'payments')
        const guessedMode: ImportMode = payMap.external_id || /paypal|venmo|bank|statement/i.test(f.name) ? 'payments' : 'purchases'
        const k = guessKind(f.name, guessedMode)
        setFile({ name: f.name, headers, rows: data })
        applyMode(guessedMode, headers, data)
        setKind(k)
        setMethod(KINDS.find((x) => x.value === k)!.method)
        setInclude({})
        setAssign({})
        setCarForRow({})
        setShowAll(false)
      },
      error: (e) => setParseError(e.message),
    })
  }

  function applyMode(m: ImportMode, headers: string[], rows: Row[]) {
    const map = guessMapping(headers, m)
    setMode(m)
    setMapping(map)
    setSplit(m === 'payments' && !!map.counterparty && looksLikeTypeAndName(rows.map((r) => r[map.counterparty!] ?? '')))
    if (m === 'purchases' && map.car) {
      const values = [...new Set(rows.map((r) => (r[map.car!] ?? '').trim()).filter(Boolean))]
      setCarForValue(Object.fromEntries(values.map((v) => [v, matchCar(v, cars)?.id ?? ''])))
    } else {
      setCarForValue({})
    }
  }

  const known = useMemo(() => new Set(existingIds.filter((k) => k.startsWith(`${method}:`)).map((k) => k.slice(method.length + 1))), [existingIds, method])

  const payments = useMemo(() => {
    if (!file || mode !== 'payments') return []
    const out = previewPayments(file.rows, mapping, { splitCounterparty: split, existingIds: known })
    // The same transaction twice in one file is imported once.
    const seen = new Set<string>()
    for (const r of out) {
      if (!r.include || !r.external_id) continue
      if (seen.has(r.external_id)) {
        r.include = false
        r.reason = 'Duplicate row in this file'
      }
      seen.add(r.external_id)
    }
    return out
  }, [file, mode, mapping, split, known])

  const purchases = useMemo(() => (file && mode === 'purchases' ? previewPurchases(file.rows, mapping) : []), [file, mode, mapping])

  const rows = mode === 'payments' ? payments : purchases
  const isIncluded = (r: { index: number; include: boolean }) => include[r.index] ?? r.include
  const canInclude = (r: { index: number }) =>
    mode === 'payments'
      ? payments[r.index].date !== null && payments[r.index].amount_cents !== null
      : purchases[r.index].title !== null && purchases[r.index].price_cents !== null
  const selected = rows.filter((r) => isIncluded(r) && canInclude(r))
  const total =
    mode === 'payments'
      ? payments.filter((r) => selected.includes(r)).reduce((n, r) => n + (r.amount_cents ?? 0), 0)
      : purchases.filter((r) => selected.includes(r)).reduce((n, r) => n + (r.price_cents ?? 0) + r.shipping_cents, 0)
  const fields = mode === 'payments' ? PAYMENT_FIELDS : PURCHASE_FIELDS
  const missingRequired = fields.filter((f) => f.required && !mapping[f.key])

  const purchaseCar = (index: number) => {
    if (carForRow[index] !== undefined) return carForRow[index]
    const v = purchases[index]?.car_value
    return v ? (carForValue[v] ?? '') : ''
  }

  function commit() {
    if (!file) return
    const payload: ImportPayload = {
      kind,
      filename: file.name,
      method,
      location_status: location,
      payments:
        mode === 'payments'
          ? payments
              .filter((r) => selected.includes(r))
              .map((r) => {
                const a = assign[r.index] ?? 'none'
                const [as, car_id] = a.split('|')
                return {
                  id: crypto.randomUUID(),
                  amount_cents: r.amount_cents!,
                  paid_at: r.date!,
                  counterparty: r.counterparty,
                  memo: r.memo,
                  external_id: r.external_id,
                  raw: r.raw,
                  assign: a === 'none' ? { as: 'none' as const } : as === 'parts' ? { as: 'parts' as const, car_id } : { as: as as CostType, car_id },
                }
              })
          : [],
      purchases:
        mode === 'purchases'
          ? purchases
              .filter((r) => selected.includes(r))
              .map((r) => ({
                id: crypto.randomUUID(),
                car_id: purchaseCar(r.index) || null,
                title: r.title!,
                qty: r.qty,
                source: r.source,
                seller_name: r.seller,
                listing_url: r.listing_url,
                price_cents: r.price_cents!,
                shipping_cents: r.shipping_cents,
                purchased_at: r.purchased_at,
                condition: r.condition,
                notes: r.notes,
                payment_method: r.payment_method,
              }))
          : [],
    }
    startTransition(async () => {
      const res = await commitImport(payload)
      setResult(res)
      if (res.ok) setFile(null)
    })
  }

  return (
    <div className="space-y-6">
      {result?.ok && (
        <p role="status" className="flex flex-wrap items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm text-ok">
          <Check aria-hidden size={16} />
          Imported {plural(result.payments, 'payment')} and {plural(result.purchases, 'purchase')}.
          <Link href="/money" className="font-semibold underline">
            Assign payments on Money
          </Link>
        </p>
      )}
      {result && !result.ok && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-strong">
          {result.message}
        </p>
      )}

      {/* 1. File */}
      <section aria-labelledby="file-h" className="rounded-2xl border border-border bg-surface p-4">
        <h2 id="file-h" className="font-semibold">1. Choose a CSV file</h2>
        <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-bg px-4 py-5 hover:border-muted">
          <FileUp aria-hidden size={22} className="shrink-0 text-muted" />
          <span className="min-w-0 text-sm">
            {file ? (
              <>
                <span className="font-medium">{file.name}</span>
                <span className="block text-muted">
                  {file.rows.length} rows, {file.headers.length} columns. Choose another file to replace it.
                </span>
              </>
            ) : (
              <>
                <span className="font-medium">Select a .csv file</span>
                <span className="block text-muted">Nothing is saved until you press Import.</span>
              </>
            )}
          </span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
        </label>
        {parseError && <p role="alert" className="mt-2 text-sm text-accent-strong">{parseError}</p>}
      </section>

      {file && (
        <>
          {/* 2. What and how */}
          <section aria-labelledby="what-h" className="space-y-4 rounded-2xl border border-border bg-surface p-4">
            <h2 id="what-h" className="font-semibold">2. What’s in it?</h2>
            <div role="radiogroup" aria-label="Each row is" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1 text-sm font-medium">
              {(
                [
                  ['payments', 'Payments I made'],
                  ['purchases', 'Parts I bought'],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    applyMode(m, file.headers, file.rows)
                    setInclude({})
                    if (m === 'purchases') setKind('sheet')
                    else if (kind === 'sheet') setKind(guessKind(file.name, 'payments'))
                  }}
                  className={`h-10 rounded-lg ${mode === m ? 'bg-surface shadow-sm' : 'text-muted'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {mode === 'payments' ? (
                <>
                  <label className="block text-sm">
                    <span className="font-medium">Exported from</span>
                    <select
                      value={kind}
                      onChange={(e) => {
                        const k = e.target.value as Kind
                        setKind(k)
                        setMethod(KINDS.find((x) => x.value === k)!.method)
                      }}
                      className={`${field} mt-1`}
                    >
                      {KINDS.filter((k) => k.value !== 'sheet').map((k) => (
                        <option key={k.value} value={k.value}>{k.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Paid with</span>
                    <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={`${field} mt-1`}>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}
              <label className="col-span-2 block text-sm sm:col-span-1">
                <span className="font-medium">Parts this creates are</span>
                <select value={location} onChange={(e) => setLocation(e.target.value as LocationStatus)} className={`${field} mt-1`}>
                  {(['at_home', 'at_builder', 'installed', 'in_transit_to_us', 'with_seller'] as const).map((l) => (
                    <option key={l} value={l}>{LOCATION_LABELS[l]}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {/* 3. Columns */}
          <section aria-labelledby="cols-h" className="rounded-2xl border border-border bg-surface p-4">
            <h2 id="cols-h" className="font-semibold">3. Match columns</h2>
            <p className="mt-0.5 text-sm text-muted">Guessed from the headers. Change anything that’s wrong.</p>
            <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
              {fields.map((f) => {
                const col = mapping[f.key]
                const sample = col ? file.rows.find((r) => r[col]?.trim())?.[col] : undefined
                return (
                  <label key={f.key} className="block text-sm">
                    <span className="font-medium">
                      {f.label}
                      {f.required && <span className="text-accent-strong"> *</span>}
                    </span>
                    <select value={col ?? ''} onChange={(e) => setMapping({ ...mapping, [f.key]: e.target.value || null })} className={`${field} mt-1`}>
                      <option value="">Not in this file</option>
                      {file.headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    {sample && <span className="mt-0.5 block truncate text-xs text-muted">e.g. {sample}</span>}
                  </label>
                )
              })}
            </div>
            {mode === 'payments' && mapping.counterparty && (
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
                <span>
                  “Paid to” looks like <em>Type: Name</em>. Use only the name.
                </span>
              </label>
            )}
            {mode === 'purchases' && Object.keys(carForValue).length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium">Cars in your file</h3>
                <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                  {Object.entries(carForValue).map(([value, carId]) => (
                    <li key={value} className="flex items-center gap-2 text-sm">
                      <span className="w-28 shrink-0 truncate" title={value}>{value}</span>
                      <select value={carId} onChange={(e) => setCarForValue({ ...carForValue, [value]: e.target.value })} className={field} aria-label={`Car for “${value}”`}>
                        <option value="">No car (spare)</option>
                        {cars.map((c) => (
                          <option key={c.id} value={c.id}>{c.nickname}</option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {missingRequired.length > 0 && (
              <p role="alert" className="mt-3 flex gap-2 text-sm text-warn">
                <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
                Pick a column for {missingRequired.map((f) => f.label).join(' and ')}.
              </p>
            )}
          </section>

          {/* 4. Preview */}
          <section aria-labelledby="rows-h" className="rounded-2xl border border-border bg-surface">
            <div className="flex items-baseline justify-between gap-2 p-4 pb-2">
              <h2 id="rows-h" className="font-semibold">4. Check the rows</h2>
              <span className="tabular text-sm text-muted">
                {selected.length} of {rows.length} selected
              </span>
            </div>
            {mode === 'payments' && (
              <p className="px-4 pb-2 text-sm text-muted">
                Payments you leave unassigned go to <strong className="font-medium text-text">Money → To assign</strong>. Assigning one to a car here is optional.
              </p>
            )}
            <ul className="divide-y divide-border border-t border-border">
              {(showAll ? rows : rows.slice(0, PREVIEW_ROWS)).map((r) => {
                const on = isIncluded(r) && canInclude(r)
                const p = mode === 'payments' ? payments[r.index] : null
                const q = mode === 'purchases' ? purchases[r.index] : null
                const samePayee = p?.counterparty ? payments.filter((x) => x.counterparty === p.counterparty && isIncluded(x) && canInclude(x)) : []
                const a = assign[r.index] ?? 'none'
                return (
                  <li key={r.index} className={`px-4 py-3 ${on ? '' : 'opacity-60'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={!canInclude(r)}
                        onChange={(e) => setInclude({ ...include, [r.index]: e.target.checked })}
                        aria-label={`Import row ${r.index + 1}`}
                        className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate font-medium">{p ? (p.counterparty ?? 'Unknown payee') : (q?.title ?? 'No part name')}</span>
                          <span className="tabular shrink-0 font-semibold">
                            {p ? (p.amount_cents !== null ? formatCents(p.amount_cents) : '?') : q?.price_cents !== null ? formatCents((q?.price_cents ?? 0) + (q?.shipping_cents ?? 0)) : '?'}
                          </span>
                        </div>
                        <p className="truncate text-xs text-muted">
                          {p ? [p.date, p.type, p.memo].filter(Boolean).join(' · ') : [q?.purchased_at, q?.seller, q?.car_value].filter(Boolean).join(' · ')}
                        </p>
                        {r.reason && <p className={`mt-0.5 text-xs ${on ? 'text-warn' : 'text-muted'}`}>{r.reason}</p>}

                        {on && p && cars.length > 0 && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <label className="min-w-0 flex-1 sm:max-w-xs">
                              <span className="sr-only">Assign</span>
                              <select value={a} onChange={(e) => setAssign({ ...assign, [r.index]: e.target.value })} className={field}>
                                <option value="none">Assign later</option>
                                {cars.map((c) => (
                                  <optgroup key={c.id} label={c.nickname}>
                                    <option value={`parts|${c.id}`}>Parts for {c.nickname}</option>
                                    {COST_TYPES.map((t) => (
                                      <option key={t} value={`${t}|${c.id}`}>{COST_TYPE_LABELS[t]}, {c.nickname}</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </label>
                            {a !== 'none' && samePayee.length > 1 && samePayee.some((x) => (assign[x.index] ?? 'none') !== a) && (
                              <button
                                type="button"
                                onClick={() => setAssign({ ...assign, ...Object.fromEntries(samePayee.map((x) => [x.index, a])) })}
                                className="text-xs font-medium text-accent-strong underline"
                              >
                                Same for all {samePayee.length} to {p.counterparty}
                              </button>
                            )}
                          </div>
                        )}
                        {on && q && (
                          <label className="mt-2 block sm:max-w-xs">
                            <span className="sr-only">Car</span>
                            <select value={purchaseCar(r.index)} onChange={(e) => setCarForRow({ ...carForRow, [r.index]: e.target.value })} className={field}>
                              <option value="">No car (spare)</option>
                              {cars.map((c) => (
                                <option key={c.id} value={c.id}>{c.nickname}</option>
                              ))}
                            </select>
                          </label>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
            {rows.length > PREVIEW_ROWS && (
              <button type="button" onClick={() => setShowAll(!showAll)} className="w-full border-t border-border py-3 text-sm font-medium text-muted hover:text-text">
                {showAll ? `Show first ${PREVIEW_ROWS} only` : `Show all ${rows.length} rows`}
              </button>
            )}
          </section>

          {/* 5. Commit */}
          <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 rounded-2xl border border-border bg-surface p-3 shadow-lg md:bottom-4">
            <button
              type="button"
              onClick={commit}
              disabled={pending || selected.length === 0 || missingRequired.length > 0}
              className="h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60"
            >
              {pending
                ? 'Importing…'
                : `Import ${selected.length} ${mode === 'payments' ? 'payment' : 'purchase'}${selected.length === 1 ? '' : 's'} · ${formatCents(total)}`}
            </button>
            <p className="mt-1.5 text-center text-xs text-muted">Saved as one batch you can undo below.</p>
          </div>
        </>
      )}
    </div>
  )
}
