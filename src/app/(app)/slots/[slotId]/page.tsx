import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, TriangleAlert } from 'lucide-react'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  BUILD_STATUSES,
  LOCATION_LABELS,
  SOURCE_LABELS,
  SYSTEM_LABELS,
  parseYearRange,
  type BuildStatus,
  type CarSystem,
  type Destination,
  type EngineVariant,
  type Generation,
  type LocationStatus,
  type Source,
} from '@/lib/domain'
import { formatCents } from '@/lib/money'
import { requireHousehold } from '@/lib/session'
import { signedUrls } from '@/lib/storage'
import { setBuildStatus } from '../actions'
import { AddPurchaseButton } from './AddPurchaseButton'
import { LocationSelect } from './LocationSelect'
import { PhotoUpload } from './PhotoUpload'
import { SlotDetailsForm } from './SlotDetailsForm'

export const metadata: Metadata = { title: 'Part' }

type Slot = {
  id: string
  car_id: string
  system: CarSystem
  subsystem: string | null
  name: string
  required_qty: number
  have_qty: number
  fitment_notes: string | null
  fits_years: string | null
  destination: Destination
  build_status: BuildStatus
  needs_review: boolean
  template_key: string | null
}

type Car = { id: string; nickname: string; year: number; generation: Generation; original_engine_variant: EngineVariant; target_engine_variant: EngineVariant }

type Acquisition = {
  id: string
  title: string
  qty: number
  condition: string | null
  source: Source
  seller_name: string | null
  listing_url: string | null
  price_cents: number
  shipping_cents: number
  purchased_at: string | null
  location_status: LocationStatus
}

type Money = { acquisition_id: string; cost_cents: number; allocated_cents: number; payment_state: 'unpaid' | 'partial' | 'paid' }
type LocationEvent = { acquisition_id: string; from_status: LocationStatus | null; to_status: LocationStatus; changed_at: string }
type Attachment = { id: string; entity_type: string; entity_id: string; storage_path: string; caption: string | null }
type FigureLink = { figure: { id: string; title: string; page: number; storage_path: string; document: { title: string } } }

const STATUS_LABEL: Record<BuildStatus, string> = { needed: 'Needed', sourcing: 'Sourcing', have: 'Have', installed: 'Installed' }

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const formatDate = (d: string) => dateFmt.format(new Date(d.length === 10 ? `${d}T12:00:00` : d))

export default async function SlotPage(props: PageProps<'/slots/[slotId]'>) {
  const { slotId } = await props.params
  const { supabase, householdId } = await requireHousehold()

  const slotRes = await supabase
    .from('slot_progress')
    .select('id, car_id, system, subsystem, name, required_qty, have_qty, fitment_notes, fits_years, destination, build_status, needs_review, template_key')
    .eq('id', slotId)
    .maybeSingle()
  if (slotRes.error) throw slotRes.error
  if (!slotRes.data) notFound()
  const slot = slotRes.data as Slot

  const [carRes, acqRes, figRes] = await Promise.all([
    supabase.from('cars').select('id, nickname, year, generation, original_engine_variant, target_engine_variant').eq('id', slot.car_id).single(),
    supabase
      .from('acquisitions')
      .select('id, title, qty, condition, source, seller_name, listing_url, price_cents, shipping_cents, purchased_at, location_status')
      .eq('slot_id', slotId)
      .order('purchased_at', { ascending: false }),
    slot.template_key
      ? supabase.from('figure_slot_links').select('figure:document_figures(id, title, page, storage_path, document:documents(title))').eq('template_key', slot.template_key)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (carRes.error) throw carRes.error
  if (acqRes.error) throw acqRes.error
  const car = carRes.data as Car
  const acquisitions = acqRes.data as Acquisition[]
  const acqIds = acquisitions.map((a) => a.id)
  const figures = ((figRes.data ?? []) as unknown as FigureLink[]).map((l) => l.figure)

  const [moneyRes, eventsRes, attRes] = await Promise.all([
    supabase.from('acquisition_money').select('acquisition_id, cost_cents, allocated_cents, payment_state').in('acquisition_id', acqIds),
    supabase.from('acquisition_location_events').select('acquisition_id, from_status, to_status, changed_at').in('acquisition_id', acqIds).order('changed_at'),
    supabase
      .from('attachments')
      .select('id, entity_type, entity_id, storage_path, caption')
      .or(`and(entity_type.eq.slot,entity_id.eq.${slotId}),and(entity_type.eq.acquisition,entity_id.in.(${acqIds.join(',') || '00000000-0000-0000-0000-000000000000'}))`)
      .order('created_at'),
  ])
  const money = new Map(((moneyRes.data ?? []) as Money[]).map((m) => [m.acquisition_id, m]))
  const events = (eventsRes.data ?? []) as LocationEvent[]
  const attachments = (attRes.data ?? []) as Attachment[]
  const [photoUrls, figureUrls] = await Promise.all([
    signedUrls(supabase, 'photos', attachments.map((a) => a.storage_path)),
    signedUrls(supabase, 'manuals', figures.map((f) => f.storage_path)),
  ])

  const range = parseYearRange(slot.fits_years)
  const covered = slot.have_qty >= slot.required_qty
  const suggestHave = covered && (slot.build_status === 'needed' || slot.build_status === 'sourcing')

  return (
    <div>
      <PageHeader
        title={slot.name}
        subtitle={
          <span className="flex flex-col gap-1">
            <span>
              {car.nickname} · {SYSTEM_LABELS[slot.system]}
              {slot.subsystem ? ` › ${slot.subsystem}` : ''}
            </span>
            <EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />
          </span>
        }
        back={{ href: `/cars/${car.id}/systems/${slot.system}`, label: SYSTEM_LABELS[slot.system] }}
      />

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-4">
        {slot.needs_review && (
          <p className="flex gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
            <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
            Marked for review: check this part and quantity against the build plan.
          </p>
        )}

        {/* Build status + quantity */}
        <section aria-labelledby="status-h" className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <h2 id="status-h" className="font-semibold">Build status</h2>
            <span className="tabular text-sm text-muted">
              <span className={`font-semibold ${covered ? 'text-ok' : 'text-text'}`}>{Math.min(slot.have_qty, slot.required_qty)}</span> of {slot.required_qty} on hand
            </span>
          </div>
          <form action={setBuildStatus} className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Build status">
            <input type="hidden" name="id" value={slot.id} />
            {BUILD_STATUSES.map((s) => (
              <button
                key={s}
                name="build_status"
                value={s}
                role="radio"
                aria-checked={slot.build_status === s}
                className={`h-10 rounded-lg text-sm font-medium ${slot.build_status === s ? 'bg-surface shadow-sm' : 'text-muted hover:text-text'}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </form>
          {suggestHave && (
            <form action={setBuildStatus} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
              <input type="hidden" name="id" value={slot.id} />
              <span>Purchases cover the {slot.required_qty} needed.</span>
              <button name="build_status" value="have" className="shrink-0 font-semibold underline">
                Mark as Have
              </button>
            </form>
          )}
        </section>

        {/* Purchases */}
        <section aria-labelledby="purchases-h">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="purchases-h" className="text-sm font-semibold text-muted">Purchases</h2>
            <AddPurchaseButton carId={car.id} slotId={slot.id} />
          </div>
          {acquisitions.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">Nothing bought for this slot yet.</p>
          ) : (
            <ul className="space-y-3">
              {acquisitions.map((a) => {
                const m = money.get(a.id)
                const timeline = events.filter((e) => e.acquisition_id === a.id)
                return (
                  <li key={a.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {a.title}
                          {a.qty > 1 && <span className="text-muted"> × {a.qty}</span>}
                        </p>
                        <p className="text-xs text-muted">
                          {SOURCE_LABELS[a.source]}
                          {a.seller_name ? ` · ${a.seller_name}` : ''}
                          {a.purchased_at ? ` · ${formatDate(a.purchased_at)}` : ''}
                          {a.condition ? ` · ${a.condition}` : ''}
                        </p>
                        {a.listing_url && (
                          <a href={a.listing_url} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted underline">
                            Listing <ExternalLink size={11} aria-hidden />
                          </a>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular font-semibold">{formatCents(a.price_cents + a.shipping_cents)}</p>
                        {m && <PaymentBadge m={m} />}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_1fr]">
                      <LocationSelect id={a.id} slotId={slot.id} value={a.location_status} />
                      <ol aria-label="Location history" className="space-y-1 border-l border-border pl-3 text-xs text-muted">
                        {timeline.map((e, i) => (
                          <li key={i}>
                            <span className="text-text">{LOCATION_LABELS[e.to_status]}</span> · {formatDate(e.changed_at)}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Diagrams from manuals */}
        {figures.length > 0 && (
          <section aria-labelledby="diagrams-h">
            <h2 id="diagrams-h" className="mb-2 text-sm font-semibold text-muted">Diagrams</h2>
            <ul className="grid grid-cols-2 gap-3">
              {figures.map((f) => (
                <li key={f.id}>
                  <Link href={`/library/figures/${f.id}`} className="block overflow-hidden rounded-xl border border-border bg-surface hover:border-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
                    <img src={figureUrls.get(f.storage_path)} alt="" loading="lazy" className="aspect-[4/3] w-full bg-white object-contain p-1" />
                    <div className="border-t border-border px-2.5 py-2">
                      <p className="line-clamp-2 text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-muted">{f.document.title} · p. {f.page}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Photos */}
        <section aria-labelledby="photos-h">
          <h2 id="photos-h" className="mb-2 text-sm font-semibold text-muted">Photos</h2>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {attachments.map((a) => (
              <li key={a.id}>
                <a href={photoUrls.get(a.storage_path)} target="_blank" rel="noopener" className="block aspect-square overflow-hidden rounded-xl border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
                  <img src={photoUrls.get(a.storage_path)} alt={a.caption ?? 'Part photo'} loading="lazy" className="h-full w-full object-cover" />
                </a>
              </li>
            ))}
            <li>
              <PhotoUpload householdId={householdId} entityType="slot" entityId={slot.id} />
            </li>
          </ul>
        </section>

        {/* Editable details */}
        <section aria-labelledby="details-h" className="rounded-2xl border border-border bg-surface p-4">
          <h2 id="details-h" className="mb-3 font-semibold">Details</h2>
          <SlotDetailsForm
            id={slot.id}
            required_qty={slot.required_qty}
            destination={slot.destination}
            range={range}
            fitment_notes={slot.fitment_notes}
            needs_review={slot.needs_review}
          />
        </section>
      </div>
    </div>
  )
}

function PaymentBadge({ m }: { m: Money }) {
  if (m.payment_state === 'paid') return <p className="text-xs text-ok">Paid</p>
  if (m.payment_state === 'partial')
    return (
      <p className="text-xs text-warn">
        {formatCents(m.allocated_cents)} of {formatCents(m.cost_cents)} paid
      </p>
    )
  return (
    <Link href="/money" className="text-xs text-accent-strong underline">
      Unpaid
    </Link>
  )
}
