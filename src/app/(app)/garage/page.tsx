import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Wrench } from 'lucide-react'
import { CarDiagram } from '@/components/diagram/CarDiagram'
import { CarCardHeader } from '@/components/garage/CarCardHeader'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCents } from '@/lib/money'
import { listCars } from '@/lib/queries'

export const metadata: Metadata = { title: 'Garage' }

export default async function GaragePage() {
  const cars = await listCars()

  return (
    <div>
      <PageHeader
        title="Garage"
        subtitle={cars.length ? `${cars.length} ${cars.length === 1 ? 'car' : 'cars'}` : undefined}
        action={
          <Link href="/cars/new" className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium">
            <Plus aria-hidden size={16} />
            Add car
          </Link>
        }
      />
      <div className="px-4 py-4 md:px-8">
        {cars.length === 0 ? (
          <EmptyState title="No cars yet" action={<Link href="/cars/new" className="inline-flex h-10 items-center rounded-lg bg-accent px-4 font-semibold text-white">Add your first car</Link>}>
            Adding a car fills in its parts list from the engine and conversion templates.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cars.map(({ car, systems }) => {
              const progress = Object.fromEntries(systems.map((s) => [s.system, s]))
              const over = car.budget_cents > 0 && car.spent_cents > car.budget_cents
              const pct = car.budget_cents > 0 ? Math.min(1, car.spent_cents / car.budget_cents) : 0
              return (
                <li key={car.id} className="rounded-2xl border border-border bg-surface p-4 hover:border-muted">
                  <CarCardHeader id={car.id} nickname={car.nickname} trim={car.trim} color={car.color}>
                    <EngineBadges year={car.year} generation={car.generation} original={car.original_engine_variant} target={car.target_engine_variant} />
                  </CarCardHeader>
                  <Link href={`/cars/${car.id}`} className="block">
                    <CarDiagram
                      id={`mini-${car.id}`}
                      mini
                      generation={car.generation}
                      progress={progress}
                      showConversion={car.original_engine_variant !== car.target_engine_variant}
                      className="my-3 block w-full"
                    />
                    <div className="tabular flex items-baseline justify-between text-sm">
                      <span className={over ? 'font-semibold text-warn' : 'font-semibold'}>{formatCents(car.spent_cents, { whole: true })}</span>
                      <span className="text-muted">{car.budget_cents ? `of ${formatCents(car.budget_cents, { whole: true })}` : 'No budget set'}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className={`h-full rounded-full ${over ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${pct * 100}%` }} />
                    </div>
                    <div className="mt-3 flex gap-4 text-sm text-muted">
                      <span>
                        <span className="tabular font-semibold text-text">{car.open_slots}</span> still needed
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Wrench aria-hidden size={13} />
                        <span className="tabular font-semibold text-text">{car.at_builder_count}</span> at builder
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
