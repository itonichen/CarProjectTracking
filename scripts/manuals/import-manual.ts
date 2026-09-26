// Upload a manual PDF and its extracted figures to private storage and
// record them for one household. Re-running replaces that manual.
//
//   npm run manuals:import -- <manual.pdf> <figures.json> <figures_dir> [owner-email]
//
// figures_dir comes from scripts/manuals/extract_figures.py. owner-email picks
// the household (defaults to DEV_AUTO_LOGIN_EMAIL). Local Supabase only unless
// SEED_ALLOW_REMOTE=1.

import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

type Spec = {
  slug: string
  title: string
  applies_to?: string
  source_note?: string
  figures: { key: string; page: number; section?: string; title: string; kind: 'illustration' | 'reference'; template_keys: string[] }[]
}

const [pdfPath, specPath, figuresDir, emailArg] = process.argv.slice(2)
if (!pdfPath || !specPath || !figuresDir) {
  console.error('Usage: npm run manuals:import -- <manual.pdf> <figures.json> <figures_dir> [owner-email]')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
if (!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(url) && process.env.SEED_ALLOW_REMOTE !== '1') {
  throw new Error(`Refusing to import into non-local Supabase at ${url}. Set SEED_ALLOW_REMOTE=1 to override.`)
}
const db = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } })

async function main() {
  const email = emailArg ?? process.env.DEV_AUTO_LOGIN_EMAIL
  if (!email) throw new Error('Pass an owner email or set DEV_AUTO_LOGIN_EMAIL')
  const users = await db.auth.admin.listUsers({ perPage: 1000 })
  const user = users.data?.users.find((u) => u.email === email)
  if (!user) throw new Error(`No user ${email}. Run npm run seed first?`)
  const member = await db.from('household_members').select('household_id').eq('user_id', user.id).limit(1).single()
  if (member.error) throw new Error(`${email} is not in a household`)
  const hid = member.data.household_id as string

  const spec: Spec = JSON.parse(readFileSync(specPath, 'utf8'))
  const base = `${hid}/${spec.slug}`

  const pdf = readFileSync(pdfPath)
  const up = await db.storage.from('manuals').upload(`${base}/manual.pdf`, pdf, { contentType: 'application/pdf', upsert: true })
  if (up.error) throw up.error

  await db.from('documents').delete().eq('household_id', hid).eq('slug', spec.slug)
  const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length || null
  const doc = await db
    .from('documents')
    .insert({
      household_id: hid,
      slug: spec.slug,
      title: spec.title,
      applies_to: spec.applies_to,
      source_note: spec.source_note,
      storage_path: `${base}/manual.pdf`,
      page_count: pageCount,
      size_bytes: statSync(pdfPath).size,
    })
    .select('id')
    .single()
  if (doc.error) throw doc.error

  for (const [i, f] of spec.figures.entries()) {
    const path = `${base}/figures/${f.key}.png`
    const img = await db.storage.from('manuals').upload(path, readFileSync(join(figuresDir, `${f.key}.png`)), { contentType: 'image/png', upsert: true })
    if (img.error) throw img.error
    const fig = await db
      .from('document_figures')
      .insert({ household_id: hid, document_id: doc.data.id, key: f.key, page: f.page, section: f.section, title: f.title, kind: f.kind, storage_path: path, sort_order: i })
      .select('id')
      .single()
    if (fig.error) throw fig.error
    if (f.template_keys.length) {
      const links = await db.from('figure_slot_links').insert(f.template_keys.map((template_key) => ({ household_id: hid, figure_id: fig.data.id, template_key })))
      if (links.error) throw links.error
    }
  }
  const linked = spec.figures.filter((f) => f.template_keys.length).length
  console.log(`Imported "${spec.title}": ${pageCount} pages, ${spec.figures.length} figures (${linked} linked to slots) for ${email}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
