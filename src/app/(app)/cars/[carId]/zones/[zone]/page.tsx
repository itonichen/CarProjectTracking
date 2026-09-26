import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { GroupSummary } from '@/components/car/GroupSummary'
import { SystemParts } from '@/components/car/SystemParts'
import { EmptyState } from '@/components/ui/EmptyState'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { PageHeader } from '@/components/ui/PageHeader'
import { countByBucket } from '@/lib/partsmap/buckets'
import { ZONE_BY_ID, type ZoneId } from '@/lib/partsmap/zones'
import { getCar, getZoneSlots } from '@/lib/queries'

export async function generateMetadata(props: PageProps<'/cars/[carId]/zones/[zone]'>): Promise<Metadata> {
  const { zone } = await props.params
  return { title: ZONE_BY_ID.get(zone as ZoneId)?.name ?? 'Zone' }
}

export default async function ZonePage(props: PageProps<'/cars/[carId]/zones/[zone]'>) {
  const { carId, zone } = await props.params
  const z = ZONE_BY_ID.get(zone as ZoneId)
  if (!z) notFound()
  const [data, slots] = await Promise.all([getCar(carId), getZoneSlots(carId, z.id)])
  if (!data) notFound()
  const { car } = data
  const counts = countByBucket(slots)

  return (
    <div>
      <PageHeader
        title={z.name}
        subtitle={<EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />}
        back={{ href: `/cars/${car.id}`, label: car.nickname }}
      />
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 md:px-8">
        <GroupSummary name={z.name} counts={counts} blurb={z.blurb || undefined} />
        {slots.length === 0 ? <EmptyState title="No parts in this zone yet" /> : <SystemParts slots={slots} slotHref={(id) => `/slots/${id}`} />}
      </div>
    </div>
  )
}
