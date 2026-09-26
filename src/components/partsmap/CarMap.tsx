'use client'

import { useId, useMemo, useState } from 'react'
import { Segmented } from '@/components/ui/Segmented'
import { countBuckets, type Counts, type StatusInfo } from '@/lib/partsmap/buckets'
import type { MapSlot } from '@/lib/partsmap/stats'
import { BAY, BAY_LINEART, BAY_VIEWBOX, LINEART, SIDE_VIEWBOX, ZONES, zoneOf, type Shape as ShapeData, type ZoneId } from '@/lib/partsmap/zones'
import { Shape } from './Shape'

type View = 'side' | 'bay'
type Hot = { key: string; name: string; zone: ZoneId; anchor: [number, number]; shapes: ShapeData[]; counts: Counts; outline?: boolean }

/**
 * The car illustration with zone hotspots. Side view or engine bay; each
 * hotspot's badge is a button (desktop) that reports its zone via onSelect so
 * the parts breakdown can jump to it. On phones the badges are display only
 * and the table below does the navigating.
 */
export function CarMap({
  slots,
  statuses,
  onSelect,
  highlight,
  selected,
  toolbar,
}: {
  slots: MapSlot[]
  statuses: Map<string, StatusInfo>
  onSelect: (zone: ZoneId) => void
  /** Zone to highlight from outside, e.g. while hovering its table row. */
  highlight?: ZoneId | null
  /** Zone currently picked in the breakdown. */
  selected?: ZoneId | null
  toolbar?: React.ReactNode
}) {
  const uid = useId().replace(/:/g, '')
  const [view, setView] = useState<View>('side')
  const [hover, setHover] = useState<string | null>(null)

  const hots: Hot[] = useMemo(() => {
    if (view === 'side') {
      return ZONES.map((z) => ({
        key: z.id,
        name: z.name,
        zone: z.id,
        anchor: z.anchor,
        shapes: z.shapes,
        outline: z.kind === 'part',
        counts: countBuckets(
          slots.filter((s) => zoneOf(s) === z.id),
          statuses,
        ),
      }))
    }
    return BAY.map((b) => ({
      key: b.id,
      name: b.name,
      zone: b.zone,
      anchor: b.anchor,
      shapes: b.shapes,
      counts: countBuckets(
        slots.filter((s) => s.bay === b.id),
        statuses,
      ),
    }))
  }, [view, slots, statuses])

  const vb = view === 'side' ? SIDE_VIEWBOX : BAY_VIEWBOX
  const art = view === 'side' ? LINEART : BAY_LINEART
  // Mouse hover wins, then a hovered table row, then the picked zone. In the
  // engine bay one zone covers several components, so all of them light up.
  const outside = highlight ?? selected
  const litKeys = new Set(hover ? [hover] : outside ? hots.filter((h) => h.zone === outside).map((h) => h.key) : [])
  const lit = (h: Hot) => litKeys.has(h.key)
  const holes = hots.filter(lit).flatMap((h) => h.shapes)
  const tip = hover ? hots.find((h) => h.key === hover) : undefined
  const pos = ([x, y]: [number, number]) => ({ left: `${((x - vb.x) / vb.width) * 100}%`, top: `${((y - vb.y) / vb.height) * 100}%` })

  return (
    <section aria-label="Car" className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <Segmented
          label="Illustration"
          value={view}
          options={[
            ['side', 'Side view'],
            ['bay', 'Engine bay'],
          ]}
          onChange={(v) => {
            setView(v)
            setHover(null)
          }}
        />
        <span className="flex items-center gap-3">
          <span className="text-[13px] text-faint">
            {view === 'side' ? 'Front on the right' : 'Hood up, front at the bottom'}
            <span className="hidden md:inline"> · tap a {view === 'side' ? 'zone' : 'part'}</span>
          </span>
          {toolbar}
        </span>
      </div>

      <div className="relative select-none" style={{ aspectRatio: `${vb.width} / ${vb.height}` }} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} aria-hidden className="absolute inset-0 h-full w-full" strokeLinejoin="round">
          <image href={art.href} x={0} y={0} width={art.width} height={art.height} style={{ filter: 'var(--lineart-filter)' }} />
          {holes.length > 0 && <Veil id={`${uid}-veil`} vb={vb} holes={holes} />}
          {hots.map((h) =>
            h.shapes.map((sh, i) => (
              <Shape
                key={`${h.key}-${i}`}
                shape={sh}
                vectorEffect="non-scaling-stroke"
                // Desktop only: hovering a shape highlights it; clicks go to the zone.
                className="pointer-events-none cursor-pointer md:pointer-events-auto"
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(h.key)}
                onClick={() => onSelect(h.zone)}
                fill={lit(h) && !h.outline ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : h.key === 'drivetrain' ? 'var(--surface-2)' : 'transparent'}
                stroke={lit(h) ? 'var(--accent)' : h.key === 'drivetrain' ? 'var(--zone-line)' : 'transparent'}
                strokeWidth={lit(h) ? (h.outline ? 3 : 2) : 1.5}
                strokeDasharray={h.key === 'drivetrain' && !lit(h) ? '6 4' : undefined}
              />
            )),
          )}
        </svg>

        {hots
          .filter((h) => h.counts.total > 0)
          .map((h) => {
            const done = h.counts.built === h.counts.total
            const text = `${h.counts.built}/${h.counts.total}`
            const cls = `absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-1.5 font-mono text-[10px] leading-4 font-medium sm:text-[11px] ${
              done ? 'border-st-built bg-st-built text-surface' : 'border-border bg-surface text-text'
            } ${litKeys.size > 0 && !lit(h) ? 'opacity-50' : ''}`
            return (
              <span key={h.key}>
                {/* Phones: display only. */}
                <span aria-hidden style={pos(h.anchor)} className={`${cls} pointer-events-none md:hidden`}>
                  {text}
                </span>
                <button
                  type="button"
                  style={pos(h.anchor)}
                  onClick={() => onSelect(h.zone)}
                  onPointerEnter={() => setHover(h.key)}
                  onFocus={() => setHover(h.key)}
                  onBlur={() => setHover(null)}
                  aria-label={`${h.name}: ${h.counts.built} of ${h.counts.total} built, ${h.counts.need} to buy. Show in the breakdown`}
                  className={`${cls} hidden py-0.5 outline-offset-2 hover:border-accent md:inline-block`}
                >
                  {text}
                </button>
              </span>
            )
          })}

        {tip && (
          <div
            role="tooltip"
            style={{ ...pos(tip.anchor), transform: 'translate(-50%, calc(-100% - 16px))' }}
            className="pointer-events-none absolute z-10 hidden rounded-lg bg-text px-2.5 py-1.5 text-xs whitespace-nowrap text-surface shadow-lg md:block"
          >
            <div className="font-semibold">{tip.name}</div>
            <div className="font-mono opacity-80">
              {tip.counts.built}/{tip.counts.total} built · {tip.counts.need} to buy
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/** Dims everything except the hovered shapes. */
function Veil({ id, vb, holes }: { id: string; vb: { x: number; y: number; width: number; height: number }; holes: ShapeData[] }) {
  return (
    <>
      <mask id={id}>
        <rect x={vb.x} y={vb.y} width={vb.width} height={vb.height} fill="white" />
        {holes.map((h, i) => (
          <Shape key={i} shape={h} fill="black" />
        ))}
      </mask>
      <rect x={vb.x} y={vb.y} width={vb.width} height={vb.height} fill="var(--surface)" opacity={0.5} mask={`url(#${id})`} pointerEvents="none" />
    </>
  )
}
