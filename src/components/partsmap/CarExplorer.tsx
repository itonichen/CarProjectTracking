'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight, Columns2, Rows2, TriangleAlert } from 'lucide-react'
import { useSplit } from '@/components/car/CarPageFrame'
import { useSidebar } from '@/components/nav/SidebarState'
import { Segmented } from '@/components/ui/Segmented'
import { StackedBar } from '@/components/ui/StackedBar'
import { bucketOf, type StatusInfo } from '@/lib/partsmap/buckets'
import { GROUP_COOKIE, breakdown, type Group } from '@/lib/partsmap/breakdown'
import type { MapSlot } from '@/lib/partsmap/stats'
import { BAY_BY_ID, ZONE_BY_ID, zoneOf, type BayId, type ZoneId } from '@/lib/partsmap/zones'
import { SYSTEM_LABELS } from '@/lib/domain'
import { CarMap } from './CarMap'
import { StatusDot } from './StatusDot'

// Wide card: the spec's table. Narrower card (beside the car): the bar moves
// under the name and the count columns tighten, so names stay on one line.
const COLS = 'grid-cols-[minmax(0,1fr)_repeat(4,52px)_16px] @min-[48rem]:grid-cols-[minmax(0,1.6fr)_repeat(4,72px)_minmax(120px,1fr)_16px]'
// Split view needs room for the car beside a 25rem breakdown.
const SPLIT_MIN = '(min-width: 1024px)'

type StatusRow = StatusInfo & { id: string; label?: string }

/**
 * Car illustration plus the parts breakdown. Clicking a zone on the car (on
 * desktop) collapses the sidebar and puts the breakdown beside the car, with
 * that zone highlighted and opened in both. Breakdown rows expand in place to
 * list their parts.
 */
export function CarExplorer({
  carId,
  slots,
  statuses: statusList,
  initialGroup,
}: {
  carId: string
  slots: MapSlot[]
  statuses: StatusRow[]
  initialGroup: Group
}) {
  const statuses = useMemo(() => new Map(statusList.map((s) => [s.id, s])), [statusList])
  const [group, setGroup] = useState<Group>(initialGroup)
  const [selected, setSelected] = useState<ZoneId | null>(null)
  const [rowHover, setRowHover] = useState<ZoneId | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const rows = useMemo(() => breakdown(slots, statuses, group), [slots, statuses, group])
  const table = useRef<HTMLElement>(null)
  const { split, setSplit } = useSplit()
  const { collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed } = useSidebar()
  // Only re-open the sidebar on exit if split view is what closed it.
  const closedSidebar = useRef(false)

  const toggle = (id: string) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  function changeGroup(g: Group) {
    setGroup(g)
    setOpen(new Set())
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
    setOpen((o) => new Set(o).add(zone))
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
  const partsOf = (id: string) => slots.filter((s) => (group === 'zone' ? zoneOf(s) === id : s.system === id))
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

        {/* Column headings, only when the card is wide enough for the table */}
        <div className={`hidden ${COLS} gap-2 border-t border-border bg-hover px-4 py-2 text-xs text-muted @min-[30rem]:grid @min-[48rem]:gap-3`}>
          <span>Name</span>
          <span className="text-right">To buy</span>
          <span className="text-right">Bought</span>
          <span className="text-right">Shipped</span>
          <span className="text-right">Built</span>
          <span className="hidden @min-[48rem]:block" />
          <span />
        </div>

        {rows.map((r) => {
          const expanded = open.has(r.id)
          const panelId = `parts-${r.id}`
          const chevron = <ChevronRight aria-hidden size={16} className={`text-faint transition-transform ${expanded ? 'rotate-90' : ''}`} />
          const rowButton = {
            type: 'button' as const,
            onClick: () => toggle(r.id),
            'aria-expanded': expanded,
            'aria-controls': panelId,
            ...hoverProps(r.id),
          }
          return (
            <div key={r.id} data-row={r.id} className={`border-t border-divider ${isPicked(r.id) ? 'bg-accent-soft' : ''}`}>
              {/* Table row (wide card) */}
              <button {...rowButton} className={`hidden w-full ${COLS} items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-hover @min-[30rem]:grid @min-[48rem]:gap-3`}>
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
                {chevron}
              </button>

              {/* Compact row (phones, and beside the car) */}
              <button {...rowButton} className="flex min-h-14 w-full flex-col gap-[7px] px-4 py-[13px] text-left transition-colors hover:bg-hover @min-[30rem]:hidden">
                <span className="flex w-full items-center gap-2">
                  <span className="flex-1 text-[15px]">{r.name}</span>
                  <span className="font-mono text-[13px]">
                    {r.counts.built}/{r.counts.total}
                  </span>
                  {chevron}
                </span>
                <span className="block w-full">
                  <StackedBar counts={r.counts} label={r.name} />
                </span>
                <span className="flex flex-wrap gap-x-2 text-xs text-muted">
                  <span className="text-accent">{r.counts.need} to buy</span>
                  <span>· {r.counts.bought} bought</span>
                  <span>· {r.counts.shipped} shipped</span>
                  {r.flag && <span className="text-warn">· {r.flag}</span>}
                </span>
              </button>

              {expanded && (
                <GroupParts
                  id={panelId}
                  name={r.name}
                  group={group}
                  groupId={r.id}
                  slots={partsOf(r.id)}
                  statuses={statuses}
                  pageHref={href(r.id)}
                />
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}

/** The parts inside one breakdown row, grouped so long lists stay scannable. */
function GroupParts({
  id,
  name,
  group,
  groupId,
  slots,
  statuses,
  pageHref,
}: {
  id: string
  name: string
  group: Group
  groupId: string
  slots: MapSlot[]
  statuses: Map<string, StatusRow>
  pageHref: string
}) {
  // Engine: by bay component. Systems: by the zone each part sits in.
  const heading = (s: MapSlot) =>
    group === 'system' ? (ZONE_BY_ID.get(zoneOf(s))?.name ?? 'Other') : groupId === 'engine' ? ((s.bay && BAY_BY_ID.get(s.bay as BayId)?.name) ?? 'Elsewhere in the bay') : null
  const sections = new Map<string | null, MapSlot[]>()
  for (const s of slots) sections.set(heading(s), [...(sections.get(heading(s)) ?? []), s])

  return (
    <div id={id} role="region" aria-label={`${name} parts`} className="border-t border-divider bg-bg/60 pb-2">
      {[...sections].map(([title, list]) => (
        <div key={title ?? 'all'}>
          {title && <h3 className="px-4 pt-3 pb-1 text-xs font-semibold text-muted">{title}</h3>}
          <ul>
            {list.map((s) => {
              const status = s.status_id ? statuses.get(s.status_id) : undefined
              return (
                <li key={s.id}>
                  <Link href={`/slots/${s.id}`} className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-hover">
                    <StatusDot bucket={bucketOf(s, statuses)} />
                    <span className="min-w-0 flex-1">
                      <span className="block leading-snug">{s.name}</span>
                      <span className="block text-xs text-muted">
                        {status?.label ?? s.build_status}
                        {group === 'zone' && ` · ${SYSTEM_LABELS[s.system]}`}
                      </span>
                    </span>
                    {s.needs_review && <TriangleAlert aria-label="Needs review" size={13} className="shrink-0 text-warn" />}
                    {s.required_qty > 1 && <span className="shrink-0 font-mono text-xs text-muted">×{s.required_qty}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <Link href={pageHref} className="mx-4 mt-2 inline-flex items-center gap-0.5 text-[13px] font-medium text-accent hover:underline">
        Open full {group === 'zone' ? 'zone' : 'system'} page
        <ChevronRight aria-hidden size={14} />
      </Link>
    </div>
  )
}
