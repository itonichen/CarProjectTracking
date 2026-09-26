import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CarOverview } from '@/components/car/CarOverview'
import { PageHeader } from '@/components/ui/PageHeader'
import { getPartStatuses } from '@/components/partsmap/actions'
import { getCar, getCarSlots } from '@/lib/queries'

export async function generateMetadata(props: PageProps<'/cars/[carId]'>): Promise<Metadata> {
  const { carId } = await props.params
  const data = await getCar(carId)
  return { title: data?.car.nickname ?? 'Car' }
}

export default async function CarPage(props: PageProps<'/cars/[carId]'>) {
  const { carId } = await props.params
  const [data, slots, statuses] = await Promise.all([getCar(carId), getCarSlots(carId), getPartStatuses()])
  if (!data) notFound()
  const { car, systems } = data

  return (
    <div>
      <PageHeader title={car.nickname} back={{ href: '/garage', label: 'Garage' }} />
      <div className="mx-auto max-w-6xl px-4 py-4 md:px-8">
        <CarOverview car={car} systems={systems} slots={slots} statuses={statuses} systemHref={(s) => `/cars/${car.id}/systems/${s}`} />
      </div>
    </div>
  )
}
