import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ExternalLink, X } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { SYSTEMS, SYSTEM_LABELS } from '@/lib/domain'
import { requireHousehold } from '@/lib/session'
import { signedUrls } from '@/lib/storage'
import { SLOT_TYPES, slotTypeLabel } from '@/lib/templates.labels'
import { linkFigure, unlinkFigure } from '../../actions'

export const metadata: Metadata = { title: 'Diagram' }

type Figure = {
  id: string
  page: number
  section: string | null
  title: string
  storage_path: string
  document: { title: string; storage_path: string; applies_to: string | null }
  figure_slot_links: { template_key: string }[]
}

export default async function FigurePage(props: PageProps<'/library/figures/[figureId]'>) {
  const { figureId } = await props.params
  const { supabase } = await requireHousehold()
  const { data, error } = await supabase
    .from('document_figures')
    .select('id, page, section, title, storage_path, document:documents(title, storage_path, applies_to), figure_slot_links(template_key)')
    .eq('id', figureId)
    .maybeSingle()
  if (error) throw error
  if (!data) notFound()
  const fig = data as unknown as Figure
  const urls = await signedUrls(supabase, 'manuals', [fig.storage_path, fig.document.storage_path])
  const pdfUrl = urls.get(fig.document.storage_path)
  const linked = new Set(fig.figure_slot_links.map((l) => l.template_key))

  return (
    <div>
      <PageHeader title={fig.title} subtitle={`${fig.document.title} · page ${fig.page}`} back={{ href: '/library', label: 'Manuals' }} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-4">
        <a href={urls.get(fig.storage_path)} target="_blank" rel="noopener" className="block overflow-hidden rounded-xl border border-border bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
          <img src={urls.get(fig.storage_path)} alt={fig.title} className="w-full" />
        </a>
        {pdfUrl && (
          <a href={`${pdfUrl}#page=${fig.page}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-medium">
            <ExternalLink aria-hidden size={16} />
            Open page {fig.page} in the PDF
          </a>
        )}

        <section aria-labelledby="links-h" className="rounded-2xl border border-border bg-surface p-4">
          <h2 id="links-h" className="font-semibold">Shown on these parts</h2>
          <p className="mt-0.5 text-sm text-muted">Linked by part type, so it appears on every car that has that slot.</p>
          {fig.document.applies_to && <p className="mt-2 text-xs text-warn">{fig.document.applies_to}</p>}
          {linked.size === 0 ? (
            <p className="mt-3 text-sm text-muted">Not linked to any part yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {[...linked].map((key) => (
                <li key={key} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="flex-1">{slotTypeLabel(key)}</span>
                  <form action={unlinkFigure}>
                    <input type="hidden" name="figure_id" value={fig.id} />
                    <input type="hidden" name="template_key" value={key} />
                    <button aria-label={`Unlink ${slotTypeLabel(key)}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface-2">
                      <X size={16} aria-hidden />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={linkFigure} className="mt-3 flex gap-2">
            <input type="hidden" name="figure_id" value={fig.id} />
            <label className="min-w-0 flex-1">
              <span className="sr-only">Part to link</span>
              <select name="template_key" required defaultValue="" className="h-10 w-full rounded-lg border border-border bg-bg px-2 text-sm">
                <option value="" disabled>Link to a part…</option>
                {SYSTEMS.map((system) => {
                  const types = SLOT_TYPES.filter((s) => s.system === system && !linked.has(s.key))
                  if (!types.length) return null
                  return (
                    <optgroup key={system} label={SYSTEM_LABELS[system]}>
                      {types.map((s) => (
                        <option key={s.key} value={s.key}>{s.name} ({s.template})</option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </label>
            <button className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white">Link</button>
          </form>
        </section>
      </div>
    </div>
  )
}
