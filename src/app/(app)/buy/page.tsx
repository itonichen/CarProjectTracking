import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/PageHeader'
import type { BuildStatus, CarSystem, Destination } from '@/lib/domain'
import { requireHousehold } from '@/lib/session'
import { BuyList, type BuyItem } from './BuyList'

export const metadata: Metadata = { title: 'Buy list' }

type Row = {
  slot_id: string
  car_id: string
  car_nickname: string
  system: CarSystem
  subsystem: string | null
  name: string
  required_qty: number
  have_qty: number
  fitment_notes: string | null
  destination: Destination
  build_status: BuildStatus
  needs_review: boolean
  status_id: string | null
}

export default async function BuyPage() {
  const { supabase } = await requireHousehold()
  const [rows, statuses, cars] = await Promise.all([
    supabase
      .from('buy_list')
      .select('slot_id, car_id, car_nickname, system, subsystem, name, required_qty, have_qty, fitment_notes, destination, build_status, needs_review, status_id'),
    supabase.from('part_statuses').select('id, label'),
    supabase.from('cars').select('id, nickname').order('created_at'),
  ])
  if (rows.error) throw rows.error
  const label = new Map((statuses.data ?? []).map((s) => [s.id as string, s.label as string]))
  const items: BuyItem[] = (rows.data as Row[]).map((r) => ({ ...r, status_label: (r.status_id && label.get(r.status_id)) || null }))

  return (
    <div>
      <PageHeader title="Buy list" subtitle="Every part still needed, across all cars" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:px-8">
        <BuyList items={items} cars={cars.data ?? []} />
      </div>
    </div>
  )
}
