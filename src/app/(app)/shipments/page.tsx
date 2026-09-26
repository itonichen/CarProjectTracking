import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/PageHeader'
import type { CarSystem } from '@/lib/domain'
import { requireHousehold } from '@/lib/session'
import { ShipmentsView, type ReadyPart, type ShipmentCard } from './ShipmentsView'

export const metadata: Metadata = { title: 'Shipments' }

type SlotRow = { id: string; name: string; system: CarSystem; destination: string; status_id: string | null; car: { id: string; nickname: string } }
type ShipmentRow = Omit<ShipmentCard, 'items'> & {
  shipment_items: { id: string; slot: { id: string; name: string; car: { nickname: string } } | null; acquisition: { id: string; title: string; slot_id: string | null; car: { nickname: string } | null } | null }[]
}

export default async function ShipmentsPage() {
  const { supabase } = await requireHousehold()
  const [statuses, haveSlots, homeAcq, builderAcq, shipments, builders] = await Promise.all([
    supabase.from('part_statuses').select('id, label, at_builder'),
    supabase.from('part_slots').select('id, name, system, destination, status_id, car:cars(id, nickname)').eq('build_status', 'have'),
    supabase.from('needs_to_ship_to_builder').select('slot_id'),
    supabase.from('acquisitions').select('slot_id').eq('location_status', 'at_builder').not('slot_id', 'is', null),
    supabase
      .from('shipments')
      .select('id, carrier, tracking_number, from_label, to_label, shipped_at, delivered_at, cost_cents, notes, shipment_items(id, slot:part_slots(id, name, car:cars(nickname)), acquisition:acquisitions(id, title, slot_id, car:cars(nickname)))')
      .order('shipped_at', { ascending: false, nullsFirst: true }),
    supabase.from('builders').select('name').order('name'),
  ])
  if (haveSlots.error) throw haveSlots.error
  if (shipments.error) throw shipments.error

  const atBuilderStatus = new Set((statuses.data ?? []).filter((s) => s.at_builder).map((s) => s.id as string))
  const statusLabel = new Map((statuses.data ?? []).map((s) => [s.id as string, s.label as string]))
  const cards: ShipmentCard[] = (shipments.data as unknown as ShipmentRow[]).map(({ shipment_items, ...s }) => ({
    ...s,
    items: shipment_items.map((i) =>
      i.slot ? { id: i.id, name: i.slot.name, car: i.slot.car.nickname, slotId: i.slot.id } : { id: i.id, name: i.acquisition!.title, car: i.acquisition!.car?.nickname ?? '', slotId: i.acquisition!.slot_id },
    ),
  }))
  // Parts on a shipment that hasn't arrived yet are "in transit", not ready or at the builder.
  const inTransit = new Set(cards.filter((c) => !c.delivered_at).flatMap((c) => c.items.map((i) => i.slotId).filter(Boolean) as string[]))

  const slots = haveSlots.data as unknown as SlotRow[]
  const homeSlotIds = new Set((homeAcq.data ?? []).map((r) => r.slot_id as string))
  const ready: ReadyPart[] = slots
    .filter((s) => s.destination === 'builder' && !inTransit.has(s.id) && (!(s.status_id && atBuilderStatus.has(s.status_id)) || homeSlotIds.has(s.id)))
    .map((s) => ({ id: s.id, name: s.name, system: s.system, carId: s.car.id, car: s.car.nickname, status: (s.status_id && statusLabel.get(s.status_id)) || 'Have' }))

  const builderSlotIds = new Set((builderAcq.data ?? []).map((r) => r.slot_id as string))
  const atBuilder = slots
    .filter((s) => !inTransit.has(s.id) && ((s.status_id && atBuilderStatus.has(s.status_id)) || builderSlotIds.has(s.id)))
    .map((s) => ({ id: s.id, name: s.name, car: s.car.nickname }))

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Parts going to the builder, and what’s already there" />
      <div className="mx-auto max-w-3xl px-4 py-4 md:px-8">
        <ShipmentsView ready={ready} shipments={cards} atBuilder={atBuilder} defaultTo={(builders.data ?? [])[0]?.name ?? 'Engine builder'} />
      </div>
    </div>
  )
}
