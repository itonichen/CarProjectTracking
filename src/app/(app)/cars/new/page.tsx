import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireHousehold } from '@/lib/session'
import { NewCarForm } from './NewCarForm'

export const metadata: Metadata = { title: 'Add car' }

export default async function NewCarPage() {
  const { supabase } = await requireHousehold()
  const { data: builders } = await supabase.from('builders').select('id, name').order('name')
  return (
    <div>
      <PageHeader title="Add car" back={{ href: '/garage', label: 'Garage' }} />
      <div className="mx-auto max-w-lg px-4 py-4">
        <NewCarForm builders={builders ?? []} />
      </div>
    </div>
  )
}
