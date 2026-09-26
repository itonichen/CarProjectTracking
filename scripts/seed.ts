// Dev seed: one household, two users, four gen2 DOHC NA -> TT cars with
// template slots, and a handful of fake acquisitions, payments and shipments.
//
//   npm run seed            (uses .env.local; run after `npx supabase db reset`)
//
// Re-running replaces the seed household. Never point this at production.

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { buildSlotRows } from '../src/lib/templates.apply'
import type { BuildStatus, CarSystem, LocationStatus, PaymentMethod, Source } from '../src/lib/domain'

config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local')
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) && process.env.SEED_ALLOW_REMOTE !== '1') {
  throw new Error(`Refusing to seed non-local Supabase at ${url}. Set SEED_ALLOW_REMOTE=1 to override.`)
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
const SEED_HOUSEHOLD = 'Garage (seed data)'
const emails = (process.env.SEED_USER_EMAILS ?? 'owner@example.com,partner@example.com').split(',').map((e) => e.trim())

function check<R extends { data: unknown; error: unknown }>(res: R, what: string): NonNullable<R['data']> {
  if (res.error || res.data == null) throw new Error(`${what}: ${JSON.stringify(res.error ?? 'no data')}`)
  return res.data as NonNullable<R['data']>
}

/** For writes that return no rows. */
function ok(res: { error: { message: string } | null }, what: string) {
  if (res.error) throw new Error(`${what}: ${res.error.message}`)
}

async function ensureUser(email: string): Promise<string> {
  const list = check(await db.auth.admin.listUsers({ perPage: 1000 }), 'list users')
  const found = list.users.find((u) => u.email === email)
  if (found) return found.id
  const created = check(await db.auth.admin.createUser({ email, email_confirm: true }), `create ${email}`)
  return created.user!.id
}

const CARS = [
  { nickname: "Red '94", year: 1994, color: 'Caracas Red', budget: 18_000 },
  { nickname: "White '95", year: 1995, color: 'Pearl White', budget: 15_000 },
  { nickname: "Black '95", year: 1995, color: 'Black', budget: 15_000 },
  { nickname: "Green '96", year: 1996, color: 'Dark Green', budget: 12_000 },
]

// Fraction of each system's slots already have/installed, per car, so the
// diagram shows a spread of fill levels.
const PROGRESS: Partial<Record<CarSystem, number>>[] = [
  { engine: 0.75, conversion: 0.55, turbo_intake: 0.3, fuel: 0.6, cooling: 0.5, drivetrain: 0.25, suspension_brakes: 0.8, electrical: 0.5, body: 0.9, interior: 0.2 },
  { engine: 0.4, conversion: 0.2, fuel: 0.3, cooling: 0.75, suspension_brakes: 0.5, body: 0.6, interior: 0.66 },
  { engine: 0.15, conversion: 0.1, cooling: 0.25, electrical: 0.25, body: 0.3 },
  { engine: 0.05, suspension_brakes: 0.2, interior: 0.33 },
]

type Acq = {
  car: number
  slot?: string // template_key
  title: string
  qty?: number
  source: Source
  seller: string
  price: number
  shipping?: number
  location: LocationStatus
  daysAgo: number
  condition?: string
}

const ACQUISITIONS: Acq[] = [
  { car: 0, slot: 'engine_6G72_DOHC_TT:pistons', title: 'Wiseco 8.0:1 pistons, set of 6', qty: 6, source: 'ebay', seller: 'turbo_parts_direct', price: 899, shipping: 25, location: 'at_builder', daysAgo: 60, condition: 'new' },
  { car: 0, slot: 'engine_6G72_DOHC_TT:head_gaskets', title: 'MLS head gaskets (pair)', qty: 2, source: 'vendor', seller: 'Stealth 316', price: 219, location: 'at_builder', daysAgo: 55, condition: 'new' },
  { car: 0, slot: 'conversion_TT:turbos', title: 'TD04-09B turbos with actuators', qty: 2, source: 'forum', seller: '3si member vr4dan', price: 650, shipping: 40, location: 'in_transit_to_builder', daysAgo: 20, condition: 'used, rebuilt' },
  { car: 0, slot: 'conversion_TT:exh_manifolds', title: 'VR-4 exhaust manifolds', qty: 2, source: 'fb_marketplace', seller: 'Chris M.', price: 180, location: 'at_home', daysAgo: 12, condition: 'used' },
  { car: 0, slot: 'conversion_TT:oil_housing', title: 'Turbo oil housing', source: 'ebay', seller: 'jdm_yard', price: 85, shipping: 18, location: 'at_home', daysAgo: 9, condition: 'used' },
  { car: 1, slot: 'engine_6G72_DOHC_TT:head_gaskets', title: 'MLS head gaskets (pair)', qty: 2, source: 'vendor', seller: 'Stealth 316', price: 219, location: 'at_home', daysAgo: 30, condition: 'new' },
  { car: 1, slot: 'conversion_TT:injectors', title: '360cc injectors x6, flow tested', qty: 6, source: 'ebay', seller: 'injector_shop', price: 210, shipping: 15, location: 'with_seller', daysAgo: 2, condition: 'cleaned' },
  { car: 2, slot: 'conversion_TT:intercoolers', title: 'Stock VR-4 intercoolers (pair)', qty: 2, source: 'craigslist', seller: 'Dave', price: 120, location: 'at_home', daysAgo: 40, condition: 'used' },
  { car: 2, slot: 'conversion_TT:boost_gauge', title: 'Boost gauge 52mm', source: 'vendor', seller: 'vr4parts', price: 150, location: 'in_transit_to_us', daysAgo: 4, condition: 'new' },
  { car: 3, slot: 'conversion_TT:afr_gauge', title: 'Wideband AFR gauge kit', source: 'vendor', seller: 'vr4parts', price: 250, location: 'in_transit_to_us', daysAgo: 4, condition: 'new' },
  { car: 3, slot: 'engine_6G72_DOHC_TT:timing_belt', title: 'Timing belt kit', source: 'vendor', seller: 'Rock Auto', price: 260, shipping: 12, location: 'at_builder', daysAgo: 70, condition: 'new' },
]

type Pay = { method: PaymentMethod; amount: number; to: string; daysAgo: number; memo?: string; allocate: [acqIndex: number, amount: number][] }

const PAYMENTS: Pay[] = [
  { method: 'paypal', amount: 924, to: 'turbo_parts_direct', daysAgo: 60, allocate: [[0, 924]] },
  { method: 'card', amount: 219, to: 'Stealth 316', daysAgo: 55, allocate: [[1, 219]] },
  { method: 'zelle', amount: 690, to: 'Dan K', daysAgo: 20, memo: 'turbos', allocate: [[2, 690]] },
  { method: 'cash', amount: 180, to: 'Chris M.', daysAgo: 12, allocate: [[3, 180]] },
  { method: 'card', amount: 219, to: 'Stealth 316', daysAgo: 30, allocate: [[5, 219]] },
  { method: 'venmo', amount: 100, to: 'injector_shop', daysAgo: 2, memo: 'deposit', allocate: [[6, 100]] },
  { method: 'venmo', amount: 120, to: 'Dave', daysAgo: 40, allocate: [[7, 120]] },
  // One payment covering parts for two cars.
  { method: 'paypal', amount: 400, to: 'vr4parts', daysAgo: 4, allocate: [[8, 150], [9, 250]] },
  // Unmatched: not linked to anything yet.
  { method: 'zelle', amount: 85, to: 'Mike R', daysAgo: 6, memo: 'turbo lines?', allocate: [] },
  { method: 'venmo', amount: 45, to: 'jpark', daysAgo: 15, memo: 'bolts', allocate: [] },
]

// Builder labor: paid to the engine builder and assigned straight to cars.
const LABOR: { method: PaymentMethod; amount: number; daysAgo: number; memo: string; cars: [car: number, amount: number][] }[] = [
  { method: 'zelle', amount: 4000, daysAgo: 90, memo: 'machining deposit', cars: [[0, 2500], [3, 1500]] },
  { method: 'zelle', amount: 1800, daysAgo: 25, memo: 'head work', cars: [[0, 1800]] },
]

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10)
const cents = (dollars: number) => Math.round(dollars * 100)

async function main() {
  const userIds = await Promise.all(emails.map(ensureUser))

  const removed = await db.from('households').delete().eq('name', SEED_HOUSEHOLD)
  if (removed.error) throw new Error(`remove old seed household: ${removed.error.message}`)
  const household = check(await db.from('households').insert({ name: SEED_HOUSEHOLD }).select('id').single(), 'household')
  const hid = household.id as string
  // A user belongs to one household; drop any earlier membership (dev only).
  ok(await db.from('household_members').delete().in('user_id', userIds), 'clear memberships')
  ok(await db.from('household_members').insert(userIds.map((user_id) => ({ household_id: hid, user_id }))), 'members')

  const builder = check(
    await db.from('builders').insert({ household_id: hid, name: 'Engine builder', notes: 'Placeholder builder for seed data' }).select('id').single(),
    'builder',
  )

  const carIds: string[] = []
  for (const [i, c] of CARS.entries()) {
    const car = {
      household_id: hid,
      nickname: c.nickname,
      year: c.year,
      generation: 'gen2_1994_96' as const,
      trim: 'SL',
      original_engine_variant: '6G72_DOHC_NA' as const,
      target_engine_variant: '6G72_DOHC_TT' as const,
      drivetrain: 'FWD',
      color: c.color,
      builder_id: builder.id,
      budget_cents: cents(c.budget),
    }
    const { slots } = buildSlotRows(car)
    const id = check(await db.rpc('create_car_with_slots', { p_car: car, p_slots: slots }), `car ${c.nickname}`) as string
    carIds.push(id)

    // Mark a share of each system's slots as have/installed.
    const rows = check(await db.from('part_slots').select('id, system').eq('car_id', id).order('sort_order'), 'slots')
    const bySystem = new Map<string, string[]>()
    for (const r of rows) bySystem.set(r.system, [...(bySystem.get(r.system) ?? []), r.id])
    for (const [system, ids] of bySystem) {
      const done = Math.round((PROGRESS[i][system as CarSystem] ?? 0) * ids.length)
      const installed = ids.slice(0, Math.floor(done / 3))
      const have = ids.slice(Math.floor(done / 3), done)
      const sourcing = ids.slice(done, done + 1)
      for (const [status, list] of [['installed', installed], ['have', have], ['sourcing', sourcing]] as [BuildStatus, string[]][]) {
        if (list.length) ok(await db.from('part_slots').update({ build_status: status }).in('id', list), 'progress')
      }
    }
  }

  const acqIds: string[] = []
  for (const a of ACQUISITIONS) {
    const carId = carIds[a.car]
    let slotId: string | null = null
    if (a.slot) {
      const slot = check(await db.from('part_slots').select('id').eq('car_id', carId).eq('template_key', a.slot).single(), a.slot)
      slotId = slot.id
      const status: BuildStatus = a.location === 'with_seller' || a.location === 'in_transit_to_us' ? 'sourcing' : 'have'
      ok(await db.from('part_slots').update({ build_status: status }).eq('id', slotId), 'slot status')
    }
    const row = check(
      await db
        .from('acquisitions')
        .insert({
          household_id: hid,
          car_id: carId,
          slot_id: slotId,
          title: a.title,
          qty: a.qty ?? 1,
          condition: a.condition,
          source: a.source,
          seller_name: a.seller,
          price_cents: cents(a.price),
          shipping_cents: cents(a.shipping ?? 0),
          purchased_at: daysAgo(a.daysAgo),
          location_status: a.location,
        })
        .select('id')
        .single(),
      a.title,
    )
    acqIds.push(row.id)
  }

  for (const p of PAYMENTS) {
    const pay = check(
      await db
        .from('payments')
        .insert({ household_id: hid, method: p.method, amount_cents: cents(p.amount), paid_at: daysAgo(p.daysAgo), counterparty: p.to, memo: p.memo })
        .select('id')
        .single(),
      'payment',
    )
    if (p.allocate.length) {
      ok(
        await db.from('payment_allocations').insert(
          p.allocate.map(([i, amount]) => ({ household_id: hid, payment_id: pay.id, acquisition_id: acqIds[i], amount_cents: cents(amount) })),
        ),
        'allocations',
      )
    }
  }

  for (const l of LABOR) {
    const pay = check(
      await db
        .from('payments')
        .insert({ household_id: hid, method: l.method, amount_cents: cents(l.amount), paid_at: daysAgo(l.daysAgo), counterparty: 'Engine builder', memo: l.memo })
        .select('id')
        .single(),
      'labor payment',
    )
    ok(
      await db.from('payment_allocations').insert(
        l.cars.map(([car, amount]) => ({ household_id: hid, payment_id: pay.id, car_id: carIds[car], cost_type: 'labor', amount_cents: cents(amount) })),
      ),
      'labor allocations',
    )
  }

  const shipments = [
    { carrier: 'UPS', tracking_number: '1Z999AA10123456784', from_label: 'Home', to_label: 'Engine builder', shipped_at: daysAgo(50), delivered_at: daysAgo(46), cost_cents: cents(38), items: [0, 1] },
    { carrier: 'FedEx', tracking_number: '771234567890', from_label: 'Forum seller', to_label: 'Engine builder', shipped_at: daysAgo(3), delivered_at: null, cost_cents: 0, items: [2] },
  ]
  for (const { items, ...s } of shipments) {
    const ship = check(await db.from('shipments').insert({ household_id: hid, ...s }).select('id').single(), 'shipment')
    ok(await db.from('shipment_items').insert(items.map((i) => ({ household_id: hid, shipment_id: ship.id, acquisition_id: acqIds[i] }))), 'shipment items')
  }

  console.log(`Seeded "${SEED_HOUSEHOLD}" with ${CARS.length} cars for ${emails.join(', ')}`)
  console.log('Sign in with a magic link; local emails show up in Mailpit at http://127.0.0.1:54324')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
