// Apply the real part statuses from the parts-map design's parts.json to one
// car. Only build_status changes; slots not in parts.json are left alone.
//
//   npm run partsmap:apply -- <parts.json> "<car nickname>"          (dry run)
//   npm run partsmap:apply -- <parts.json> "<car nickname>" --apply
//
// Local Supabase only unless SEED_ALLOW_REMOTE=1.

import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { statusesFromPartsJson, type PartsJson } from '../src/lib/partsmap/parts-json'

config({ path: '.env.local', quiet: true })

const [file, nickname] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const apply = process.argv.includes('--apply')
if (!file || !nickname) {
  console.error('Usage: npm run partsmap:apply -- <parts.json> "<car nickname>" [--apply]')
  process.exit(1)
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) && process.env.SEED_ALLOW_REMOTE !== '1') {
  throw new Error(`Refusing to touch non-local Supabase at ${url}. Set SEED_ALLOW_REMOTE=1 to override.`)
}
const db = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

async function main() {
  const { byTemplate, unmapped } = statusesFromPartsJson(JSON.parse(readFileSync(file, 'utf8')) as PartsJson)
  if (unmapped.length) console.warn(`Not mapped to any slot (skipped): ${unmapped.join(', ')}`)

  const cars = await db.from('cars').select('id, nickname').eq('nickname', nickname)
  if (cars.error) throw cars.error
  if (cars.data.length !== 1) throw new Error(`Expected one car named "${nickname}", found ${cars.data.length}`)
  const carId = cars.data[0].id

  const slots = await db.from('part_slots').select('id, name, template_key, build_status').eq('car_id', carId)
  if (slots.error) throw slots.error
  const changes = slots.data.filter((s) => s.template_key && byTemplate.has(s.template_key) && byTemplate.get(s.template_key) !== s.build_status)
  const missing = [...byTemplate.keys()].filter((k) => !slots.data.some((s) => s.template_key === k))
  if (missing.length) console.warn(`This car has no slot for: ${missing.join(', ')}`)

  for (const s of changes) console.log(`${s.name}: ${s.build_status} -> ${byTemplate.get(s.template_key!)}`)
  if (apply) {
    for (const status of new Set(changes.map((s) => byTemplate.get(s.template_key!)!))) {
      const ids = changes.filter((s) => byTemplate.get(s.template_key!) === status).map((s) => s.id)
      const res = await db.from('part_slots').update({ build_status: status }).in('id', ids)
      if (res.error) throw res.error
    }
  }
  console.log(`${apply ? 'Updated' : 'Would update'} ${changes.length} of ${slots.data.length} slots on ${nickname}.${apply ? '' : ' Re-run with --apply.'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
