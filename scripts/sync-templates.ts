// Add slots that were added to src/lib/templates.ts after a car was created.
// Only inserts missing template slots; never edits or deletes existing ones.
//
//   npm run templates:sync            (dry run: lists what would be added)
//   npm run templates:sync -- --apply
//
// Local Supabase only unless SEED_ALLOW_REMOTE=1.

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import type { EngineVariant, Generation } from '../src/lib/domain'
import { buildSlotRows } from '../src/lib/templates.apply'
import { missingSlots } from '../src/lib/templates.sync'

config({ path: '.env.local', quiet: true })

const apply = process.argv.includes('--apply')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) && process.env.SEED_ALLOW_REMOTE !== '1') {
  throw new Error(`Refusing to touch non-local Supabase at ${url}. Set SEED_ALLOW_REMOTE=1 to override.`)
}
const db = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

type Car = { id: string; household_id: string; nickname: string; generation: Generation; original_engine_variant: EngineVariant; target_engine_variant: EngineVariant }

async function main() {
  const cars = await db.from('cars').select('id, household_id, nickname, generation, original_engine_variant, target_engine_variant').order('created_at')
  if (cars.error) throw cars.error
  let total = 0
  for (const car of cars.data as Car[]) {
    const existing = await db.from('part_slots').select('template_key, sort_order').eq('car_id', car.id)
    if (existing.error) throw existing.error
    const add = missingSlots(buildSlotRows(car).slots, existing.data)
    if (!add.length) continue
    total += add.length
    console.log(`${car.nickname}: ${add.map((s) => s.name).join(', ')}`)
    if (apply) {
      const rows = add.map(({ fits_from, fits_to, ...s }) => ({
        ...s,
        household_id: car.household_id,
        car_id: car.id,
        fits_years: fits_from !== undefined ? `[${fits_from},${fits_to}]` : null,
      }))
      const res = await db.from('part_slots').insert(rows)
      if (res.error) throw res.error
    }
  }
  console.log(total ? `${apply ? 'Added' : 'Would add'} ${total} slots${apply ? '' : '. Re-run with --apply to add them.'}` : 'All cars are up to date.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
