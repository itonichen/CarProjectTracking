import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { CarOverview } from '@/components/car/CarOverview'
import { getPartStatuses } from '@/components/partsmap/actions'
import { GROUP_COOKIE, parseGroup } from '@/lib/partsmap/breakdown'
import { getCar, getCarSlots } from '@/lib/queries'

export async function generateMetadata(props: PageProps<'/cars/[carId]'>): Promise<Metadata> {
  const { carId } = await props.params
  const data = await getCar(carId)
  return { title: data?.car.nickname ?? 'Car' }
}

export default async function CarPage(props: PageProps<'/cars/[carId]'>) {
  const { carId } = await props.params
  const [data, slots, statuses, jar] = await Promise.all([getCar(carId), getCarSlots(carId), getPartStatuses(), cookies()])
  if (!data) notFound()
  return <CarOverview car={data.car} slots={slots} statuses={statuses} initialGroup={parseGroup(jar.get(GROUP_COOKIE)?.value)} />
}
