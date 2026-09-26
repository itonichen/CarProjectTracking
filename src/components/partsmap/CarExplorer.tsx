'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Columns2, Rows2 } from 'lucide-react'
import { useSplit } from '@/components/car/CarPageFrame'
import { useSidebar } from '@/components/nav/SidebarState'
import { Segmented } from '@/components/ui/Segmented'
import { StackedBar } from '@/components/ui/StackedBar'
import type { StatusInfo } from '@/lib/partsmap/buckets'
import { GROUP_COOKIE, breakdown, type Group } from '@/lib/partsmap/breakdown'
import type { MapSlot } from '@/lib/partsmap/stats'
import type { ZoneId } from '@/lib/partsmap/zones'
import { CarMap } from './CarMap'

// Wide card: the spec's table. Narrower card (beside the car): the bar moves
// under the name and the count columns tighten, so names stay on one line.
const COLS = 'grid-cols-[minmax(0,1fr)_repeat(4,52px)_16px] @min-[48rem]:grid-cols-[minmax(0,1.6fr)_repeat(4,72px)_minmax(120px,1fr)_16px]'
// Split view needs room for the car beside a 25rem breakdown.
const SPLIT_MIN = '(min-width: 1024px)'

/**
 * Car illustration plus the parts breakdown. Clicking a zone on the car (on
 * desktop) collapses the sidebar and puts the breakdown beside the car, with
 * that zone highlighted in both.
 */
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
  const [selected, setSelected] = useState<ZoneId | null>(null)
  const [rowHover, setRowHover] = useState<ZoneId | null>(null)
  const rows = useMemo(() => breakdown(slots, statuses, group), [slots, statuses, group])
  const table = useRef<HTMLElement>(null)
  const { split, setSplit } = useSplit()
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebar()
  // Only re-open the sidebar on exit if split view is what closed it.
  const closedSidebar = useRef(false)

  function changeGroup(g: Group) {
    setGroup(g)
    document.cookie = `${GROUP_COOKIE}=${g}; path=/; max-age=31536000; samesite=lax`
  }

  function enterSplit() {
    if (!window.matchMedia(SPLIT_MIN).matches) return
    setSplit(true)
    if (!sidebarCollapsed) {
      setSidebarCollapsed(true)
      closedSidebar.current = true
    }
  }

  function exitSplit() {
    setSplit(false)
    if (closedSidebar.current) setSidebarCollapsed(false)
    closedSidebar.current = false
  }

  function selectZone(zone: ZoneId) {
    if (group !== 'zone') changeGroup('zone')
    setSelected(zone)
    enterSplit()
  }

  // Bring the picked row into view (it usually already is in split view).
  useEffect(() => {
    if (!selected) return
    const id = requestAnimationFrame(() => {
      const row = [...(table.current?.querySelectorAll<HTMLElement>(`[data-row="${selected}"]`) ?? [])].find((el) => el.offsetParent)
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
    return () => cancelAnimationFrame(id)
  }, [selected, split])

  // Leaving the car page with split view on: give the sidebar back.
  // (setSidebarCollapsed is a state setter, so this only runs on unmount.)
  useEffect(
    () => () => {
      if (closedSidebar.current) setSidebarCollapsed(false)
    },
    [setSidebarCollapsed],
  )

  const href = (id: string) => (group === 'zone' ? `/cars/${carId}/zones/${id}` : `/cars/${carId}/systems/${id}`)
  const isPicked = (id: string) => group === 'zone' && selected === id
  const hoverProps = (id: string) =>
    group === 'zone' ? { onMouseEnter: () => setRowHover(id as ZoneId), onMouseLeave: () => setRowHover(null), onFocus: () => setRowHover(id as ZoneId), onBlur: () => setRowHover(null) } : {}

  return (
    <div className={split ? 'grid grid-cols-[minmax(0,1fr)_25rem] items-start gap-5' : 'flex flex-col gap-5'}>
      <div className={split ? 'sticky top-6' : ''}>
        <CarMap
          slots={slots}
          statuses={statuses}
          onSelect={selectZone}
          highlight={rowHover}
          selected={selected}
          toolbar={
            <button
              type="button"
              onClick={split ? exitSplit : enterSplit}
              aria-pressed={split}
              title={split ? 'Stack the car and the breakdown' : 'Show the breakdown beside the car'}
              className="hidden h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[13px] font-medium text-text-2 hover:bg-surface-2 lg:inline-flex"
            >
              {split ? <Rows2 aria-hidden size={15} /> : <Columns2 aria-hidden size={15} />}
              {split ? 'Stacked' : 'Side by side'}
            </button>
          }
        />
      </div>

      <section ref={table} aria-labelledby="breakdown-h" className="@container overflow-hidden rounded-2xl border border-border bg-surface">
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

        {/* Table when the card is wide enough */}
        <div className="hidden @min-[30rem]:block">
          <div className={`grid ${COLS} gap-2 border-t border-border bg-hover px-4 py-2 text-xs text-muted @min-[48rem]:gap-3`}>
            <span>Name</span>
            <span className="text-right">To buy</span>
            <span className="text-right">Bought</span>
            <span className="text-right">Shipped</span>
            <span className="text-right">Built</span>
            <span className="hidden @min-[48rem]:block" />
            <span />
          </div>
          {rows.map((r) => (
            <Link
              key={r.id}
              href={href(r.id)}
              data-row={r.id}
              {...hoverProps(r.id)}
              className={`grid ${COLS} items-center gap-2 border-t border-divider px-4 py-3 text-sm transition-colors hover:bg-hover @min-[48rem]:gap-3 ${isPicked(r.id) ? 'bg-accent-soft hover:bg-accent-soft' : ''}`}
            >
              <span className="flex min-w-0 flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px]">
                  {r.name}
                  {r.flag && <span className="rounded-[5px] bg-warn-soft px-1.5 py-0.5 text-xs text-warn">{r.flag}</span>}
                </span>
                <span className="@min-[48rem]:hidden">
                  <StackedBar counts={r.counts} label={r.name} />
                </span>
              </span>
              <span className="text-right font-mono text-accent">{r.counts.need}</span>
              <span className="text-right font-mono">{r.counts.bought}</span>
              <span className="text-right font-mono">{r.counts.shipped}</span>
              <span className="text-right font-mono">{r.counts.built}</span>
              <span className="hidden @min-[48rem]:block">
                <StackedBar counts={r.counts} label={r.name} />
              </span>
              <ChevronRight aria-hidden size={16} className="text-faint" />
            </Link>
          ))}
        </div>

        {/* Rows on narrow cards: phones, and beside the car in split view */}
        <div className="@min-[30rem]:hidden">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={href(r.id)}
              data-row={r.id}
              {...hoverProps(r.id)}
              className={`flex min-h-14 flex-col gap-[7px] border-t border-divider px-4 py-[13px] transition-colors ${isPicked(r.id) ? 'bg-accent-soft' : ''}`}
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
    </div>
  )
}
