'use client'

import Link from 'next/link'
import { startTransition, useActionState, useMemo, useRef, useState } from 'react'
import { Camera, Check, Loader2, TriangleAlert } from 'lucide-react'
import { EngineBadges } from '@/components/ui/EngineBadges'
import {
  LOCATION_LABELS,
  LOCATION_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  SOURCES,
  SOURCE_LABELS,
  SYSTEMS,
  SYSTEM_LABELS,
  formatYearRange,
  parseYearRange,
  yearFits,
  type LocationStatus,
  type PaymentMethod,
  type Source,
} from '@/lib/domain'
import { resizeImage } from '@/lib/images'
import { formatCents, parseDollarsToCents } from '@/lib/money'
import { defaultLocationFor } from '@/lib/schemas/acquisition'
import { createClient } from '@/lib/supabase/client'
import { quickAdd, type QuickAddCar, type QuickAddSlot, type QuickAddState } from './actions'
import { extractListingFromImage } from './extractListingFromImage'

export type Prefill = { carId?: string; slotId?: string }

type Options = { householdId: string; cars: QuickAddCar[]; slots: QuickAddSlot[] }

// Per-device conveniences; the app works fine without them.
const STICKY_KEY = 'quick-add:last'
type Sticky = { carId?: string; source?: Source; method?: PaymentMethod | '' }
function readSticky(): Sticky {
  try {
    return JSON.parse(localStorage.getItem(STICKY_KEY) ?? '{}')
  } catch {
    return {}
  }
}
function writeSticky(s: Sticky) {
  try {
    localStorage.setItem(STICKY_KEY, JSON.stringify(s))
  } catch {}
}

const field = 'block h-11 w-full rounded-xl border border-border bg-bg px-3 text-base outline-none focus:border-accent'
const chip = (on: boolean) =>
  `h-9 shrink-0 rounded-full border px-3 text-sm font-medium ${on ? 'border-accent bg-accent-soft text-accent-strong' : 'border-border text-muted'}`

export function QuickAddForm({ options, prefill, onDone }: { options: Options; prefill: Prefill; onDone: () => void }) {
  const { cars, slots, householdId } = options
  const [sticky] = useState(readSticky)
  const [id, setId] = useState(() => crypto.randomUUID())
  const [carId, setCarId] = useState(prefill.carId ?? (cars.some((c) => c.id === sticky.carId) ? sticky.carId! : (cars[0]?.id ?? '')))
  const [slotId, setSlotId] = useState(prefill.slotId ?? '')
  const [source, setSource] = useState<Source>(sticky.source ?? 'ebay')
  const [location, setLocation] = useState<LocationStatus>(defaultLocationFor(sticky.source ?? 'ebay') as LocationStatus)
  const [method, setMethod] = useState<PaymentMethod | ''>(sticky.method ?? '')
  const [price, setPrice] = useState('')
  const [shipping, setShipping] = useState('')
  const [photo, setPhoto] = useState<{ preview: string; status: 'uploading' | 'done' | 'error'; path?: string } | null>(null)
  const upload = useRef<Promise<string | null> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const car = cars.find((c) => c.id === carId)
  const carSlots = useMemo(() => slots.filter((s) => s.car_id === carId), [slots, carId])
  const slot = carSlots.find((s) => s.id === slotId)
  const range = parseYearRange(slot?.fits_years)
  const fitsWarning = car && slot && !yearFits(car.year, range)
  const total = (parseDollarsToCents(price) ?? 0) + (parseDollarsToCents(shipping) ?? 0)

  const [state, action, pending] = useActionState<QuickAddState, FormData>(async (prev, fd) => {
    // Let a photo that's still uploading finish, then attach its path.
    const path = upload.current ? await upload.current : null
    if (path) fd.set('photo_path', path)
    const result = await quickAdd(prev, fd)
    if (result.savedId) {
      writeSticky({ carId, source, method })
      // Ready for the next part; car, source and payment method stay.
      setId(crypto.randomUUID())
      setSlotId('')
      setPrice('')
      setShipping('')
      setPhoto(null)
      upload.current = null
      formRef.current?.reset()
    }
    return result
  }, {})
  const err = (k: string) => state.errors?.[k]?.[0]

  async function onPhoto(file: File | undefined) {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setPhoto({ preview, status: 'uploading' })
    upload.current = (async () => {
      const blob = await resizeImage(file)
      const path = `${householdId}/acquisition/${id}/${crypto.randomUUID()}.jpg`
      const { error } = await createClient().storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
      if (error) {
        setPhoto({ preview, status: 'error' })
        return null
      }
      setPhoto({ preview, status: 'done', path })
      return path
    })()
    // Later this fills in title/price/seller from the photo; a no-op for now.
    const extracted = await extractListingFromImage(file)
    if (extracted && formRef.current) {
      const input = (name: string) => formRef.current!.elements.namedItem(name) as HTMLInputElement
      if (extracted.title && !input('title').value) input('title').value = extracted.title
      if (extracted.seller_name && !input('seller_name').value) input('seller_name').value = extracted.seller_name
      if (extracted.price_cents !== undefined && !price) setPrice((extracted.price_cents / 100).toFixed(2))
    }
  }

  return (
    <form
      ref={formRef}
      // Submit by hand: a form `action` resets every field even when the
      // save fails, which would wipe what was typed.
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startTransition(() => action(fd))
      }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="car_id" value={carId} />
      <input type="hidden" name="source" value={source} />
      <input type="hidden" name="payment_method" value={method} />

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {state.savedId && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
            <Check size={16} aria-hidden />
            Saved. Add the next one, or{' '}
            <button type="button" onClick={onDone} className="font-semibold underline">
              close
            </button>
            .
          </p>
        )}

        <div className="flex gap-3">
          <label className="grid h-[4.5rem] w-[4.5rem] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-border bg-bg text-muted">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={photo.preview} alt="Selected photo" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-0.5 text-xs">
                <Camera size={20} aria-hidden />
                Photo
              </span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="sr-only">What did you buy?</span>
              <input name="title" required placeholder="What did you buy?" autoComplete="off" className={field} />
            </label>
            {err('title') && <p role="alert" className="mt-1 text-xs text-accent-strong">{err('title')}</p>}
            {photo && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                {photo.status === 'uploading' && <><Loader2 size={12} className="animate-spin" aria-hidden /> Uploading photo…</>}
                {photo.status === 'done' && <><Check size={12} aria-hidden /> Photo attached</>}
                {photo.status === 'error' && <span className="text-accent-strong">Photo didn’t upload; saving without it.</span>}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2">
          <label className="block">
            <span className="text-xs font-medium text-muted">Price $</span>
            <input name="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Shipping $</span>
            <input name="shipping" inputMode="decimal" value={shipping} onChange={(e) => setShipping(e.target.value)} placeholder="0" className={field} />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted">Qty</span>
            <input name="qty" type="number" inputMode="numeric" min={1} defaultValue={1} className={field} />
          </label>
        </div>
        {(err('price') || err('shipping')) && <p role="alert" className="-mt-2 text-xs text-accent-strong">{err('price') ?? err('shipping')}</p>}

        <fieldset className="min-w-0">
          <legend className="text-xs font-medium text-muted">From</legend>
          <div className="mt-1 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={source === s}
                onClick={() => {
                  setSource(s)
                  setLocation(defaultLocationFor(s) as LocationStatus)
                }}
                className={chip(source === s)}
              >
                {SOURCE_LABELS[s]}
              </button>
            ))}
          </div>
          <input name="seller_name" placeholder="Seller name" autoComplete="off" className={`${field} mt-2`} />
        </fieldset>

        <fieldset className="min-w-0">
          <legend className="text-xs font-medium text-muted">For car</legend>
          <div className="mt-1 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {cars.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={carId === c.id}
                onClick={() => {
                  setCarId(c.id)
                  setSlotId('')
                }}
                className={chip(carId === c.id)}
              >
                {c.nickname}
              </button>
            ))}
            <button type="button" aria-pressed={carId === ''} onClick={() => { setCarId(''); setSlotId('') }} className={chip(carId === '')}>
              Spare
            </button>
          </div>
          {car && (
            <div className="mt-1.5">
              <EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />
            </div>
          )}
        </fieldset>

        {car && (
          <label className="block">
            <span className="text-xs font-medium text-muted">Slot</span>
            <select name="slot_id" value={slotId} onChange={(e) => setSlotId(e.target.value)} className={field}>
              <option value="">No slot yet</option>
              {SYSTEMS.map((system) => {
                const list = carSlots.filter((s) => s.system === system)
                if (!list.length) return null
                return (
                  <optgroup key={system} label={SYSTEM_LABELS[system]}>
                    {list.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({Math.min(s.have_qty, s.required_qty)}/{s.required_qty}){s.build_status === 'installed' ? ' · installed' : ''}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            {slot && (
              <span className="mt-1 block text-xs text-muted">
                {slot.subsystem ? `${slot.subsystem} · ` : ''}Fits {formatYearRange(range)}
              </span>
            )}
          </label>
        )}
        {fitsWarning && (
          <p role="alert" className="flex gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            <TriangleAlert size={16} aria-hidden className="mt-0.5 shrink-0" />
            This slot is listed for {formatYearRange(range)}, but {car.nickname} is a {car.year}. Double-check fitment.
          </p>
        )}

        <fieldset className="min-w-0">
          <legend className="text-xs font-medium text-muted">Paid with</legend>
          <div className="mt-1 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            <button type="button" aria-pressed={method === ''} onClick={() => setMethod('')} className={chip(method === '')}>
              Not yet
            </button>
            {PAYMENT_METHODS.map((m) => (
              <button key={m} type="button" aria-pressed={method === m} onClick={() => setMethod(m)} className={chip(method === m)}>
                {PAYMENT_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-xs font-medium text-muted">Where is it now?</span>
          <select name="location_status" value={location} onChange={(e) => setLocation(e.target.value as LocationStatus)} className={field}>
            {LOCATION_STATUSES.filter((l) => l !== 'returned' && l !== 'sold').map((l) => (
              <option key={l} value={l}>{LOCATION_LABELS[l]}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium text-muted">Listing link (optional)</span>
          <input name="listing_url" type="url" inputMode="url" autoComplete="off" className={field} />
        </label>

        {state.message && <p role="alert" className="text-sm text-accent-strong">{state.message}</p>}
      </div>

      <div className="border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button disabled={pending} className="h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
          {pending ? 'Saving…' : total > 0 ? `Save · ${formatCents(total)}${method ? ` paid by ${PAYMENT_METHOD_LABELS[method]}` : ''}` : 'Save'}
        </button>
        {slot && (
          <Link href={`/slots/${slot.id}`} onClick={onDone} className="mt-2 block text-center text-xs text-muted underline">
            Open {slot.name} instead
          </Link>
        )}
      </div>
    </form>
  )
}
