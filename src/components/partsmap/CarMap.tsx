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
export function CarMap({ slots, statuses, onSelect }: { slots: MapSlot[]; statuses: Map<string, StatusInfo>; onSelect: (zone: ZoneId) => void }) {
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
  const active = hots.find((h) => h.key === hover)
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
        <span className="text-[13px] text-faint">
          {view === 'side' ? 'Front on the right' : 'Hood up, front at the bottom'}
          <span className="hidden md:inline"> · tap a {view === 'side' ? 'zone' : 'part'}</span>
        </span>
      </div>

      <div className="relative select-none" style={{ aspectRatio: `${vb.width} / ${vb.height}` }} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} aria-hidden className="absolute inset-0 h-full w-full" strokeLinejoin="round">
          <image href={art.href} x={0} y={0} width={art.width} height={art.height} style={{ filter: 'var(--lineart-filter)' }} />
          {active && <Veil id={`${uid}-veil`} vb={vb} holes={active.shapes} />}
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
                fill={hover === h.key && !h.outline ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : h.key === 'drivetrain' ? 'var(--surface-2)' : 'transparent'}
                stroke={hover === h.key ? 'var(--accent)' : h.key === 'drivetrain' ? 'var(--zone-line)' : 'transparent'}
                strokeWidth={hover === h.key ? (h.outline ? 3 : 2) : 1.5}
                strokeDasharray={h.key === 'drivetrain' && hover !== h.key ? '6 4' : undefined}
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
            } ${active && active.key !== h.key ? 'opacity-50' : ''}`
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

        {active && (
          <div
            role="tooltip"
            style={{ ...pos(active.anchor), transform: 'translate(-50%, calc(-100% - 16px))' }}
            className="pointer-events-none absolute z-10 hidden rounded-lg bg-text px-2.5 py-1.5 text-xs whitespace-nowrap text-surface shadow-lg md:block"
          >
            <div className="font-semibold">{active.name}</div>
            <div className="font-mono opacity-80">
              {active.counts.built}/{active.counts.total} built · {active.counts.need} to buy
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
