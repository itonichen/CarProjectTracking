import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CarOverview } from '@/components/car/CarOverview'
import { PageHeader } from '@/components/ui/PageHeader'
import { getCar } from '@/lib/queries'

export async function generateMetadata(props: PageProps<'/cars/[carId]'>): Promise<Metadata> {
  const { carId } = await props.params
  const data = await getCar(carId)
  return { title: data?.car.nickname ?? 'Car' }
}

export default async function CarPage(props: PageProps<'/cars/[carId]'>) {
  const { carId } = await props.params
  const data = await getCar(carId)
  if (!data) notFound()
  const { car, systems } = data

  return (
    <div>
      <PageHeader title={car.nickname} back={{ href: '/garage', label: 'Garage' }} />
      <div className="px-4 py-4 md:px-8">
        <CarOverview car={car} systems={systems} systemHref={(s) => `/cars/${car.id}/systems/${s}`} />
      </div>
    </div>
  )
}
