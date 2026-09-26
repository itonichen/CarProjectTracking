import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SystemParts } from '@/components/car/SystemParts'
import { EmptyState } from '@/components/ui/EmptyState'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { PageHeader } from '@/components/ui/PageHeader'
import { SYSTEMS, SYSTEM_LABELS, type CarSystem } from '@/lib/domain'
import { getCar, getSystemSlots } from '@/lib/queries'

export async function generateMetadata(props: PageProps<'/cars/[carId]/systems/[system]'>): Promise<Metadata> {
  const { system } = await props.params
  return { title: SYSTEM_LABELS[system as CarSystem] ?? 'System' }
}

export default async function SystemPage(props: PageProps<'/cars/[carId]/systems/[system]'>) {
  const { carId, system } = await props.params
  if (!SYSTEMS.includes(system as CarSystem)) notFound()
  const [data, slots] = await Promise.all([getCar(carId), getSystemSlots(carId, system as CarSystem)])
  if (!data) notFound()
  const { car } = data

  return (
    <div>
      <PageHeader
        title={SYSTEM_LABELS[system as CarSystem]}
        subtitle={<EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />}
        back={{ href: `/cars/${car.id}`, label: car.nickname }}
      />
      <div className="px-4 py-4 md:px-8">
        {slots.length === 0 ? (
          <EmptyState title="No parts in this system yet">Slots come from the templates when a car is added. You can add slots by hand from here soon.</EmptyState>
        ) : (
          <SystemParts slots={slots} slotHref={(id) => `/slots/${id}`} />
        )}
      </div>
    </div>
  )
}
