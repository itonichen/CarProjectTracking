import { notFound } from 'next/navigation'
import { SystemParts, type SlotListItem } from '@/components/car/SystemParts'
import { EngineBadges } from '@/components/ui/EngineBadges'
import { PageHeader } from '@/components/ui/PageHeader'
import { SYSTEMS, SYSTEM_LABELS, type BuildStatus, type CarSystem } from '@/lib/domain'
import { buildSlotRows } from '@/lib/templates.apply'

// Dev-only exploded view with fixture data.
export default async function SystemPreview(props: PageProps<'/dev/diagram/[system]'>) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { system } = await props.params
  if (!SYSTEMS.includes(system as CarSystem)) notFound()

  const { slots } = buildSlotRows({ generation: 'gen2_1994_96', original_engine_variant: '6G72_DOHC_NA', target_engine_variant: '6G72_DOHC_TT' })
  const statuses: BuildStatus[] = ['installed', 'have', 'have', 'sourcing', 'needed', 'needed']
  const items: SlotListItem[] = slots
    .filter((s) => s.system === system)
    .map((s, i) => {
      const build_status = statuses[i % statuses.length]
      const have_qty = build_status === 'needed' ? 0 : build_status === 'sourcing' ? Math.floor(s.required_qty / 2) : s.required_qty
      return {
        id: String(i),
        subsystem: s.subsystem,
        name: s.name,
        required_qty: s.required_qty,
        have_qty,
        build_status,
        destination: s.destination,
        needs_review: s.needs_review,
        fitment_notes: s.fitment_notes,
        fits_years: s.fits_from ? `[${s.fits_from},${s.fits_to! + 1})` : null,
      }
    })

  return (
    <div>
      <PageHeader
        title={SYSTEM_LABELS[system as CarSystem]}
        subtitle={<EngineBadges year={1994} generation="gen2_1994_96" original="6G72_DOHC_NA" target="6G72_DOHC_TT" />}
        back={{ href: '/dev/diagram', label: "Red '94" }}
      />
      <div className="px-4 py-4 md:px-8">
        <SystemParts slots={items} slotHref={() => '#'} />
      </div>
    </div>
  )
}
