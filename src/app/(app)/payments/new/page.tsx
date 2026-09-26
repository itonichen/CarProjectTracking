import type { Metadata } from 'next'
import { PageHeader } from '@/components/ui/PageHeader'
import { NewPaymentForm } from './NewPaymentForm'

export const metadata: Metadata = { title: 'Add payment' }

export default function NewPaymentPage() {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div>
      <PageHeader title="Add payment or invoice" back={{ href: '/money', label: 'Money' }} />
      <div className="mx-auto max-w-lg px-4 py-4">
        <NewPaymentForm today={today} />
      </div>
    </div>
  )
}
