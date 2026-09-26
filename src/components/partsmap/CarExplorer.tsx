'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Segmented } from '@/components/ui/Segmented'
import { StackedBar } from '@/components/ui/StackedBar'
import type { StatusInfo } from '@/lib/partsmap/buckets'
import { GROUP_COOKIE, breakdown, type Group } from '@/lib/partsmap/breakdown'
import type { MapSlot } from '@/lib/partsmap/stats'
import type { ZoneId } from '@/lib/partsmap/zones'
import { CarMap } from './CarMap'

const COLS = 'grid-cols-[minmax(0,1.6fr)_repeat(4,72px)_minmax(120px,1fr)_16px]'

/** Car illustration plus the parts breakdown; tapping a zone jumps the table to it. */
export function CarExplorer({
  carId,
  slots,
  statuses: statusList,
  initialGroup,
}: {
  carId: string
  slots: MapSlot[]
  statuses: (StatusInfo & { id: string })[]
  initialGroup: Group
}) {
  const statuses = useMemo(() => new Map(statusList.map((s) => [s.id, s])), [statusList])
  const [group, setGroup] = useState<Group>(initialGroup)
  const [focus, setFocus] = useState<string | null>(null)
  const rows = useMemo(() => breakdown(slots, statuses, group), [slots, statuses, group])
  const table = useRef<HTMLElement>(null)

  function changeGroup(g: Group) {
    setGroup(g)
    document.cookie = `${GROUP_COOKIE}=${g}; path=/; max-age=31536000; samesite=lax`
  }

  function selectZone(zone: ZoneId) {
    if (group !== 'zone') changeGroup('zone')
    setFocus(zone)
  }

  // Scroll the chosen zone's row into view and let the highlight fade.
  useEffect(() => {
    if (!focus) return
    const row = table.current?.querySelector<HTMLElement>(`[data-row="${focus}"]`)
    row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const t = setTimeout(() => setFocus(null), 2400)
    return () => clearTimeout(t)
  }, [focus])

  const href = (id: string) => (group === 'zone' ? `/cars/${carId}/zones/${id}` : `/cars/${carId}/systems/${id}`)

  return (
    <>
      <CarMap slots={slots} statuses={statuses} onSelect={selectZone} />

      <section ref={table} aria-labelledby="breakdown-h" className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3.5">
          <h2 id="breakdown-h" className="text-base font-semibold">
            Parts breakdown
          </h2>
          <Segmented
            label="Group parts"
            size="sm"
            value={group}
            options={[
              ['zone', 'By zone'],
              ['system', 'By system'],
            ]}
            onChange={changeGroup}
          />
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <div className={`grid ${COLS} gap-3 border-t border-border bg-hover px-4 py-2 text-xs text-muted`}>
            <span>Name</span>
            <span className="text-right">To buy</span>
            <span className="text-right">Bought</span>
            <span className="text-right">Shipped</span>
            <span className="text-right">Built</span>
            <span />
            <span />
          </div>
          {rows.map((r) => (
            <Link
              key={r.id}
              href={href(r.id)}
              data-row={r.id}
              className={`grid ${COLS} items-center gap-3 border-t border-divider px-4 py-3 text-sm transition-colors hover:bg-hover ${focus === r.id ? 'bg-accent-soft' : ''}`}
            >
              <span className="flex flex-wrap items-center gap-2 text-[15px]">
                {r.name}
                {r.flag && <span className="rounded-[5px] bg-warn-soft px-1.5 py-0.5 text-xs text-warn">{r.flag}</span>}
              </span>
              <span className="text-right font-mono text-accent">{r.counts.need}</span>
              <span className="text-right font-mono">{r.counts.bought}</span>
              <span className="text-right font-mono">{r.counts.shipped}</span>
              <span className="text-right font-mono">{r.counts.built}</span>
              <StackedBar counts={r.counts} label={r.name} />
              <ChevronRight aria-hidden size={16} className="text-faint" />
            </Link>
          ))}
        </div>

        {/* Phone rows */}
        <div className="md:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={href(r.id)}
              data-row={r.id}
              className={`flex min-h-14 flex-col gap-[7px] border-t border-divider px-4 py-[13px] transition-colors ${focus === r.id ? 'bg-accent-soft' : ''}`}
            >
              <span className="flex items-center gap-2">
                <span className="flex-1 text-[15px]">{r.name}</span>
                <span className="font-mono text-[13px]">
                  {r.counts.built}/{r.counts.total}
                </span>
                <ChevronRight aria-hidden size={16} className="text-faint" />
              </span>
              <StackedBar counts={r.counts} label={r.name} />
              <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                <span className="text-accent">{r.counts.need} to buy</span>
                <span>· {r.counts.bought} bought</span>
                <span>· {r.counts.shipped} shipped</span>
                {r.flag && <span className="text-warn">· {r.flag}</span>}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
