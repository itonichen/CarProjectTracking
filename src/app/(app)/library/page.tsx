import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink, Link2 } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { requireHousehold } from '@/lib/session'
import { signedUrls } from '@/lib/storage'

export const metadata: Metadata = { title: 'Manuals' }

type Doc = { id: string; title: string; applies_to: string | null; source_note: string | null; storage_path: string; page_count: number | null; size_bytes: number | null }
type Fig = { id: string; document_id: string; page: number; section: string | null; title: string; kind: string; storage_path: string; figure_slot_links: { template_key: string }[] }

export default async function LibraryPage() {
  const { supabase } = await requireHousehold()
  const [docs, figs] = await Promise.all([
    supabase.from('documents').select('id, title, applies_to, source_note, storage_path, page_count, size_bytes').order('title'),
    supabase.from('document_figures').select('id, document_id, page, section, title, kind, storage_path, figure_slot_links(template_key)').order('sort_order'),
  ])
  if (docs.error) throw docs.error
  if (figs.error) throw figs.error
  const documents = docs.data as Doc[]
  const figures = figs.data as Fig[]
  const urls = await signedUrls(supabase, 'manuals', [...documents.map((d) => d.storage_path), ...figures.map((f) => f.storage_path)])

  return (
    <div>
      <PageHeader title="Manuals" subtitle="Service manuals and the diagrams linked to your parts" />
      <div className="space-y-10 px-4 py-4 md:px-8">
        {documents.length === 0 && (
          <EmptyState title="No manuals yet">
            Import one with <code className="rounded bg-surface-2 px-1">npm run manuals:import</code>. See the README.
          </EmptyState>
        )}
        {documents.map((doc) => {
          const docFigs = figures.filter((f) => f.document_id === doc.id)
          const sections = [...new Set(docFigs.map((f) => f.section ?? 'Other'))]
          return (
            <section key={doc.id} aria-labelledby={`doc-${doc.id}`} className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <h2 id={`doc-${doc.id}`} className="text-lg font-semibold">{doc.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {doc.page_count} pages · {doc.size_bytes ? `${(doc.size_bytes / 1e6).toFixed(1)} MB` : ''}
                </p>
                {doc.applies_to && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">{doc.applies_to}</p>}
                {doc.source_note && <p className="mt-2 text-xs text-muted">{doc.source_note}</p>}
                {urls.get(doc.storage_path) && (
                  <a href={urls.get(doc.storage_path)} target="_blank" rel="noopener" className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-white">
                    <ExternalLink aria-hidden size={16} />
                    Open PDF
                  </a>
                )}
              </div>
              {sections.map((section) => (
                <div key={section}>
                  <h3 className="mb-2 text-sm font-semibold text-muted">{section}</h3>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {docFigs
                      .filter((f) => (f.section ?? 'Other') === section)
                      .map((f) => (
                        <li key={f.id}>
                          <Link href={`/library/figures/${f.id}`} className="block overflow-hidden rounded-xl border border-border bg-surface hover:border-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
                            <img src={urls.get(f.storage_path)} alt="" loading="lazy" className="aspect-[4/3] w-full bg-white object-contain p-1" />
                            <div className="border-t border-border px-2.5 py-2">
                              <p className="line-clamp-2 text-sm font-medium">{f.title}</p>
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                                Page {f.page}
                                {f.figure_slot_links.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-ok">
                                    · <Link2 aria-hidden size={12} /> {f.figure_slot_links.length} linked
                                  </span>
                                )}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
