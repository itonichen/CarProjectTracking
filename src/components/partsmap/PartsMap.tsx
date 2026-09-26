'use client'

import { useId, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import { progressOf, type MapSlot, type Progress } from '@/lib/partsmap/stats'
import { BAY, BAY_BY_ID, BAY_LINEART, BAY_VIEWBOX, LINEART, SIDE_VIEWBOX, ZONES, ZONE_BY_ID, zoneOf, type BayId, type Shape as ShapeData, type ZoneId } from '@/lib/partsmap/zones'
import type { PartStatus } from './actions'
import { PartDetailPanel } from './PartDetailPanel'
import { Shape } from './Shape'
import { StatusDot } from './StatusDot'

type Target = { kind: 'zone'; id: ZoneId } | { kind: 'bay'; id: BayId }
type View = 'side' | 'bay'

const sameTarget = (a: Target | null, b: Target | null) => !!a && !!b && a.kind === b.kind && a.id === b.id

/**
 * Interactive parts map from the design handoff: a side view traced over line
 * art with location zones, and a top-down engine bay. The panel beside it is a
 * stack: all zones → a zone's parts → one part (status, notes, payments).
 */
export function PartsMap({ slots: initial, statuses: initialStatuses }: { slots: MapSlot[]; statuses: PartStatus[] }) {
  const uid = useId().replace(/:/g, '')
  const [view, setView] = useState<View>('side')
  const [hover, setHover] = useState<Target | null>(null)
  const [mouse, setMouse] = useState(false)
  const [pinned, setPinned] = useState<Target | null>(null)
  const [openSlot, setOpenSlot] = useState<string | null>(null)
  const [rowHover, setRowHover] = useState<string | null>(null)
  const [statuses, setStatuses] = useState(initialStatuses)
  // Status changes made in the panel show on the map before the page refreshes.
  const [override, setOverride] = useState<Record<string, PartStatus>>({})

  const slots = useMemo(
    () => initial.map((s) => (override[s.id] ? { ...s, status_id: override[s.id].id, build_status: override[s.id].category } : s)),
    [initial, override],
  )
  const statusById = useMemo(() => new Map(statuses.map((s) => [s.id, s])), [statuses])
  const byZone = useMemo(() => group(slots, (s) => zoneOf(s)), [slots])
  const byBay = useMemo(() => group(slots.filter((s) => s.bay && BAY_BY_ID.has(s.bay as BayId)), (s) => s.bay as BayId), [slots])

  const targetOf = (slot: MapSlot): Target =>
    view === 'bay' && slot.bay && BAY_BY_ID.has(slot.bay as BayId) ? { kind: 'bay', id: slot.bay as BayId } : { kind: 'zone', id: zoneOf(slot) }
  const rowSlot = rowHover ? slots.find((s) => s.id === rowHover) : undefined
  const openTarget = openSlot ? slots.find((s) => s.id === openSlot) : undefined
  const active = (rowSlot && targetOf(rowSlot)) ?? hover ?? (openTarget && targetOf(openTarget)) ?? pinned

  function togglePin(t: Target) {
    setOpenSlot(null)
    setPinned((p) => (sameTarget(p, t) ? null : t))
  }

  const pointerTarget = (e: React.PointerEvent | React.MouseEvent): Target | null => {
    const el = (e.target as Element).closest('[data-zone],[data-bay]') as HTMLElement | SVGElement | null
    if (!el) return null
    return el.dataset.bay ? { kind: 'bay', id: el.dataset.bay as BayId } : { kind: 'zone', id: el.dataset.zone as ZoneId }
  }

  const pinnedSlots = pinned ? (pinned.kind === 'zone' ? (byZone.get(pinned.id) ?? []) : (byBay.get(pinned.id) ?? [])) : []

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 rounded-[18px] border border-border bg-surface p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div role="tablist" aria-label="Map view" className="inline-flex rounded-lg bg-surface-2 p-0.5 text-sm font-medium">
            {(
              [
                ['side', 'Side view'],
                ['bay', 'Engine bay'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => {
                  setView(v)
                  setPinned(null)
                  setOpenSlot(null)
                  setHover(null)
                }}
                className={`h-8 rounded-md px-3 ${view === v ? 'bg-surface shadow-sm' : 'text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="hidden text-xs text-muted sm:inline">{view === 'side' ? 'Front on the right' : 'Hood up, front at the bottom'}</span>
        </div>

        {view === 'side' ? (
          <MapCanvas
            viewBox={SIDE_VIEWBOX}
            onPointerMove={(e) => {
              setMouse(e.pointerType === 'mouse')
              setHover(e.pointerType === 'mouse' ? pointerTarget(e) : null)
            }}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => {
              const t = pointerTarget(e)
              if (t) togglePin(t)
            }}
            badges={ZONES.map((z) => ({ key: z.id, anchor: z.anchor, progress: progressOf(byZone.get(z.id) ?? []), dim: !!active && !(active.kind === 'zone' && active.id === z.id) }))}
            tooltip={mouse && hover?.kind === 'zone' ? { anchor: ZONE_BY_ID.get(hover.id)!.anchor, title: ZONE_BY_ID.get(hover.id)!.name, progress: progressOf(byZone.get(hover.id) ?? []) } : null}
          >
            <image href={LINEART.href} x={0} y={0} width={LINEART.width} height={LINEART.height} pointerEvents="none" style={{ filter: 'var(--lineart-filter)' }} />
            {active?.kind === 'zone' && <Veil id={`${uid}-side`} viewBox={SIDE_VIEWBOX} holes={ZONE_BY_ID.get(active.id)!.shapes} />}
            {ZONES.map((z) => {
              const isActive = active?.kind === 'zone' && active.id === z.id
              const isPinned = pinned?.kind === 'zone' && pinned.id === z.id
              const p = progressOf(byZone.get(z.id) ?? [])
              return (
                <g
                  key={z.id}
                  data-zone={z.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isPinned}
                  aria-label={`${z.name}: ${p.done} of ${p.total} have, ${p.open} needed`}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), togglePin({ kind: 'zone', id: z.id }))}
                  onFocus={() => setHover({ kind: 'zone', id: z.id })}
                  onBlur={() => setHover(null)}
                  className="cursor-pointer outline-none"
                >
                  {z.shapes.map((sh, i) => (
                    <Shape
                      key={i}
                      shape={sh}
                      vectorEffect="non-scaling-stroke"
                      fill={
                        z.id === 'drivetrain' && !isActive
                          ? 'var(--surface-2)'
                          : z.kind === 'region' && isActive
                            ? `color-mix(in srgb, var(--accent) ${isPinned ? 16 : 9}%, transparent)`
                            : 'transparent'
                      }
                      stroke={isActive ? 'var(--accent)' : z.id === 'drivetrain' ? 'var(--zone-line)' : 'transparent'}
                      strokeWidth={isActive ? (z.kind === 'part' ? 3 : 2) : 1.5}
                      strokeDasharray={z.id === 'drivetrain' && !isActive ? '6 4' : undefined}
                    />
                  ))}
                </g>
              )
            })}
          </MapCanvas>
        ) : (
          <MapCanvas
            viewBox={BAY_VIEWBOX}
            onPointerMove={(e) => {
              setMouse(e.pointerType === 'mouse')
              setHover(e.pointerType === 'mouse' ? pointerTarget(e) : null)
            }}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => {
              const t = pointerTarget(e)
              if (t) togglePin(t)
            }}
            badges={BAY.map((b) => ({ key: b.id, anchor: b.anchor, progress: progressOf(byBay.get(b.id) ?? []), dim: !!active && !(active.kind === 'bay' && active.id === b.id) }))}
            tooltip={mouse && hover?.kind === 'bay' ? { anchor: BAY_BY_ID.get(hover.id)!.anchor, title: BAY_BY_ID.get(hover.id)!.name, progress: progressOf(byBay.get(hover.id) ?? []) } : null}
          >
            <image href={BAY_LINEART.href} x={0} y={0} width={BAY_LINEART.width} height={BAY_LINEART.height} pointerEvents="none" style={{ filter: 'var(--lineart-filter)' }} />
            {active?.kind === 'bay' && <Veil id={`${uid}-bay`} viewBox={BAY_VIEWBOX} holes={BAY_BY_ID.get(active.id)!.shapes} />}
            {BAY.map((b) => {
              const isActive = active?.kind === 'bay' && active.id === b.id
              const isPinned = pinned?.kind === 'bay' && pinned.id === b.id
              const p = progressOf(byBay.get(b.id) ?? [])
              return (
                <g
                  key={b.id}
                  data-bay={b.id}
                  data-zone={b.zone}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isPinned}
                  aria-label={`${b.name}: ${p.done} of ${p.total} have, ${p.open} needed`}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), togglePin({ kind: 'bay', id: b.id }))}
                  onFocus={() => setHover({ kind: 'bay', id: b.id })}
                  onBlur={() => setHover(null)}
                  className="cursor-pointer outline-none"
                >
                  {b.shapes.map((sh, i) => (
                    <Shape
                      key={i}
                      shape={sh}
                      vectorEffect="non-scaling-stroke"
                      fill={isActive ? `color-mix(in srgb, var(--accent) ${isPinned ? 16 : 9}%, transparent)` : 'transparent'}
                      stroke={isActive ? 'var(--accent)' : 'transparent'}
                      strokeWidth={2}
                    />
                  ))}
                </g>
              )
            })}
          </MapCanvas>
        )}

        <ul aria-label="Status key" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {statuses.map((s) => (
            <li key={s.id} className="inline-flex items-center gap-1.5">
              <StatusDot status={s.category} size={10} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      {/* Panel: all zones → a zone's parts → one part */}
      <section aria-live="polite" className="min-w-0 rounded-[18px] border border-border bg-surface">
        {openSlot && pinned ? (
          <PartDetailPanel
            slotId={openSlot}
            backLabel={(pinned.kind === 'zone' ? ZONE_BY_ID.get(pinned.id)?.name : BAY_BY_ID.get(pinned.id)?.name) ?? 'Back'}
            onBack={() => setOpenSlot(null)}
            statuses={statuses}
            onStatusesChange={setStatuses}
            onStatusChange={(id, status) => setOverride((o) => ({ ...o, [id]: status }))}
          />
        ) : pinned ? (
          <PartList
            target={pinned}
            slots={pinnedSlots}
            view={view}
            statusById={statusById}
            onBack={() => setPinned(null)}
            onOpenBay={() => {
              setView('bay')
              setPinned(null)
            }}
            onOpen={setOpenSlot}
            onRowHover={setRowHover}
          />
        ) : (
          <Overview
            items={
              view === 'side'
                ? ZONES.slice()
                    .sort((a, b) => zoneOrder(a.id) - zoneOrder(b.id))
                    .map((z) => ({ target: { kind: 'zone' as const, id: z.id }, name: z.name, progress: progressOf(byZone.get(z.id) ?? []) }))
                : BAY.map((b) => ({ target: { kind: 'bay' as const, id: b.id }, name: b.name, progress: progressOf(byBay.get(b.id) ?? []) }))
            }
            title={view === 'side' ? 'All zones' : 'Engine bay'}
            onPick={(t) => setPinned(t)}
            onHover={(t) => setHover(t)}
          />
        )}
      </section>
    </div>
  )
}

function group<K>(slots: MapSlot[], key: (s: MapSlot) => K) {
  const m = new Map<K, MapSlot[]>()
  for (const s of slots) m.set(key(s), [...(m.get(key(s)) ?? []), s])
  return m
}

const ZONE_ORDER = ['front-end', 'lighting', 'engine', 'wheel-front', 'cabin', 'body-side', 'side-vent', 'drivetrain', 'wheel-rear', 'hatch', 'rear-end']
const zoneOrder = (id: string) => ZONE_ORDER.indexOf(id)

type ViewBox = { x: number; y: number; width: number; height: number }
type Badge = { key: string; anchor: [number, number]; progress: Progress; dim: boolean }

/** SVG plus HTML badges and tooltip positioned from viewBox anchors. */
function MapCanvas({
  viewBox,
  children,
  badges,
  tooltip,
  ...handlers
}: {
  viewBox: ViewBox
  children: React.ReactNode
  badges: Badge[]
  tooltip: { anchor: [number, number]; title: string; progress: Progress } | null
  onPointerMove: (e: React.PointerEvent) => void
  onPointerLeave: () => void
  onClick: (e: React.MouseEvent) => void
}) {
  const pos = ([x, y]: [number, number]) => ({ left: `${((x - viewBox.x) / viewBox.width) * 100}%`, top: `${((y - viewBox.y) / viewBox.height) * 100}%` })
  return (
    <div className="relative select-none" style={{ aspectRatio: `${viewBox.width} / ${viewBox.height}` }}>
      <svg viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} className="absolute inset-0 h-full w-full touch-manipulation" strokeLinejoin="round" {...handlers}>
        {children}
      </svg>
      {badges
        .filter((b) => b.progress.total > 0)
        .map((b) => {
          const full = b.progress.done === b.progress.total
          return (
            <span
              key={b.key}
              aria-hidden
              style={{ ...pos(b.anchor), transform: 'translate(-50%,-50%)' }}
              className={`pointer-events-none absolute rounded-full border px-1.5 py-px font-mono text-[10px] leading-4 font-semibold transition-opacity sm:text-[11px] ${
                full ? 'border-text bg-text text-surface' : 'border-border bg-surface text-text'
              } ${b.dim ? 'opacity-50' : ''}`}
            >
              {b.progress.done}/{b.progress.total}
            </span>
          )
        })}
      {tooltip && (
        <div
          role="tooltip"
          style={{ ...pos(tooltip.anchor), transform: 'translate(-50%, calc(-100% - 16px))' }}
          className="pointer-events-none absolute z-10 rounded-lg bg-text px-2.5 py-1.5 text-xs whitespace-nowrap text-surface shadow-lg"
        >
          <div className="font-semibold">{tooltip.title}</div>
          <div className="font-mono opacity-80">
            {tooltip.progress.done}/{tooltip.progress.total} have · {tooltip.progress.open} needed
          </div>
        </div>
      )}
    </div>
  )
}

/** Dims everything except the active shapes. */
function Veil({ id, viewBox, holes }: { id: string; viewBox: ViewBox; holes: ShapeData[] }) {
  return (
    <>
      <mask id={id}>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="white" />
        {holes.map((h, i) => (
          <Shape key={i} shape={h} fill="black" />
        ))}
      </mask>
      <rect x={viewBox.x} y={viewBox.y} width={viewBox.width} height={viewBox.height} fill="var(--surface)" opacity={0.5} mask={`url(#${id})`} pointerEvents="none" />
    </>
  )
}

function Overview({
  items,
  title,
  onPick,
  onHover,
}: {
  items: { target: Target; name: string; progress: Progress }[]
  title: string
  onPick: (t: Target) => void
  onHover: (t: Target | null) => void
}) {
  return (
    <div>
      <h2 className="border-b border-border px-4 py-3 font-semibold">{title}</h2>
      <ul className="divide-y divide-border">
        {items.map(({ target, name, progress: p }) => (
          <li key={target.id}>
            <button
              type="button"
              onClick={() => onPick(target)}
              onMouseEnter={() => onHover(target)}
              onMouseLeave={() => onHover(null)}
              className="block w-full px-4 py-2.5 text-left hover:bg-surface-2"
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{name}</span>
                <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                  {p.total ? `${p.done}/${p.total}` : '–'}
                  <ChevronRight aria-hidden size={14} />
                </span>
              </div>
              <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-text" style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PartList({
  target,
  slots,
  view,
  statusById,
  onBack,
  onOpenBay,
  onOpen,
  onRowHover,
}: {
  target: Target
  slots: MapSlot[]
  view: View
  statusById: Map<string, PartStatus>
  onBack: () => void
  onOpenBay: () => void
  onOpen: (id: string) => void
  onRowHover: (id: string | null) => void
}) {
  const zone = target.kind === 'zone' ? ZONE_BY_ID.get(target.id)! : null
  const bay = target.kind === 'bay' ? BAY_BY_ID.get(target.id)! : null
  const p = progressOf(slots)
  // Long zones (the engine) read better grouped by bay component.
  const groups = target.kind === 'zone' && slots.length > 12 ? [...group(slots, (s) => (s.bay && BAY_BY_ID.get(s.bay as BayId)?.name) || 'Elsewhere in the zone')] : [[null, slots] as const]

  return (
    <div>
      <button type="button" onClick={onBack} className="flex w-full items-center gap-1 border-b border-border px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text">
        <ChevronLeft aria-hidden size={18} />
        {view === 'side' ? 'All zones' : 'Engine bay'}
      </button>
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-semibold">{zone?.name ?? bay?.name}</h2>
        <p className="font-mono text-xs text-muted">
          {p.done}/{p.total} have · {p.open} needed
        </p>
        {zone?.blurb && <p className="mt-1 text-xs text-muted">{zone.blurb}</p>}
      </div>
      {zone?.id === 'engine' && view === 'side' && (
        <button type="button" onClick={onOpenBay} className="flex w-full items-center justify-between border-b border-border px-4 py-2.5 text-sm font-semibold text-accent-strong hover:bg-surface-2">
          Open engine bay
          <ArrowRight size={16} aria-hidden />
        </button>
      )}
      {slots.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted">No parts here yet.</p>
      ) : (
        <div className="max-h-[32rem] overflow-y-auto">
          {groups.map(([heading, list]) => (
            <div key={heading ?? 'all'}>
              {heading && <h3 className="bg-surface-2/60 px-4 py-1.5 text-xs font-semibold text-muted">{heading}</h3>}
              <ul className="divide-y divide-border">
                {list.map((s) => (
                  <li key={s.id} onMouseEnter={() => onRowHover(s.id)} onMouseLeave={() => onRowHover(null)}>
                    <button type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2">
                      <StatusDot status={s.build_status} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm">{s.name}</span>
                        <span className="block text-xs text-muted">{(s.status_id && statusById.get(s.status_id)?.label) ?? s.build_status}</span>
                      </span>
                      {s.needs_review && <TriangleAlert aria-label="Needs review" size={14} className="shrink-0 text-warn" />}
                      {s.required_qty > 1 && <span className="shrink-0 font-mono text-xs text-muted">×{s.required_qty}</span>}
                      <ChevronRight aria-hidden size={16} className="shrink-0 text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
