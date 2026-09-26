import type { Metadata } from 'next'
import { Download, Undo2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireHousehold } from '@/lib/session'
import { undoImport } from './actions'
import { ImportWizard } from './ImportWizard'

export const metadata: Metadata = { title: 'Import' }

type Batch = {
  id: string
  kind: string
  filename: string | null
  created_at: string
  payments: { count: number }[]
  acquisitions: { count: number }[]
}

const KIND_LABEL: Record<string, string> = { sheet: 'Spreadsheet', paypal: 'PayPal', venmo: 'Venmo', bank: 'Bank' }
const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default async function ImportPage() {
  const { supabase } = await requireHousehold()
  const [cars, existing, batches] = await Promise.all([
    supabase.from('cars').select('id, nickname, year').order('created_at'),
    supabase.from('payments').select('method, external_id').not('external_id', 'is', null),
    supabase.from('import_batches').select('id, kind, filename, created_at, payments(count), acquisitions(count)').order('created_at', { ascending: false }),
  ])
  if (cars.error) throw cars.error
  const existingIds = (existing.data ?? []).map((p) => `${p.method}:${p.external_id}`)

  return (
    <div>
      <PageHeader title="Import" subtitle="Bring in a PayPal, Venmo or bank export, or your parts spreadsheet" />
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-4 md:px-8">
        <ImportWizard cars={cars.data ?? []} existingIds={existingIds} />

        <section aria-labelledby="past-h">
          <h2 id="past-h" className="mb-2 text-sm font-semibold text-muted">Past imports</h2>
          {(batches.data ?? []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Nothing imported yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
              {(batches.data as Batch[]).map((b) => (
                <li key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{b.filename ?? 'Untitled file'}</p>
                    <p className="text-xs text-muted">
                      {KIND_LABEL[b.kind] ?? b.kind} · {dateFmt.format(new Date(b.created_at))} · {b.payments[0]?.count ?? 0} payments, {b.acquisitions[0]?.count ?? 0} purchases
                    </p>
                  </div>
                  <form action={undoImport}>
                    <input type="hidden" name="id" value={b.id} />
                    <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium hover:bg-surface-2" aria-label={`Undo import of ${b.filename ?? 'file'}`}>
                      <Undo2 aria-hidden size={15} />
                      Undo
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">Undo removes everything that import created, including assignments made to it since.</p>
        </section>

        <section aria-labelledby="export-h">
          <h2 id="export-h" className="mb-2 text-sm font-semibold text-muted">Export</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/api/export/purchases" download className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-medium">
              <Download aria-hidden size={16} />
              Purchases CSV
            </a>
            <a href="/api/export/payments" download className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-medium">
              <Download aria-hidden size={16} />
              Payments CSV
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
