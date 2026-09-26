import Link from 'next/link'
import { SYSTEM_LABELS, type CarSystem, type Generation } from '@/lib/domain'
import { gen2 } from './outlines/gen2'
import { GROUND_Y, VIEWBOX, WHEELS, type Outline } from './outlines/types'
import { CONVERSION_ZONE, ZONES, type Zone } from './zones'

// gen1 and gen3 get their own path sets later; they share the zone layout.
const OUTLINES: Record<Generation, Outline> = {
  gen1_1991_93: gen2, // TODO: pop-up headlight outline
  gen2_1994_96: gen2,
  gen3_1997_99: gen2, // TODO: revised bumper and larger wing outline
}

export type SystemProgress = { done: number; total: number }

type Props = {
  /** Unique per rendered diagram; used for SVG clip-path ids. */
  id: string
  generation: Generation
  progress: Partial<Record<CarSystem, SystemProgress>>
  showConversion: boolean
  /** Link target per zone. Omit for a non-interactive diagram. */
  hrefFor?: (system: CarSystem) => string
  /** Small card version: no labels, no links. */
  mini?: boolean
  className?: string
}

const pct = (p?: SystemProgress) => (p && p.total > 0 ? p.done / p.total : 0)

export function CarDiagram({ id, generation, progress, showConversion, hrefFor, mini = false, className }: Props) {
  const outline = OUTLINES[generation]
  const zones = showConversion ? [...ZONES, CONVERSION_ZONE] : ZONES
  const clip = (name: string) => `${id}-${name}`
  const interactive = Boolean(hrefFor) && !mini

  const fillColor = (p?: SystemProgress) => (p && p.total > 0 && p.done >= p.total ? 'var(--ok)' : 'var(--accent)')

  return (
    <svg
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
      className={className}
      role={mini ? 'img' : 'group'}
      aria-label={mini ? 'Build progress by system' : 'Car diagram. Choose a system to see its parts.'}
    >
      <defs>
        <clipPath id={clip('shell')}>
          <path d={outline.shell} />
          <path d={outline.extras} />
        </clipPath>
        {zones.map((z) =>
          z.kind === 'rect' ? (
            <clipPath key={z.system} id={clip(`fill-${z.system}`)}>
              <rect x={z.x} y={z.y + z.h * (1 - pct(progress[z.system]))} width={z.w} height={z.h * pct(progress[z.system])} />
            </clipPath>
          ) : null,
        )}
        {WHEELS.map((w, i) => {
          const p = pct(progress.suspension_brakes)
          const r = w.r - 6
          return (
            <clipPath key={i} id={clip(`wheel-${i}`)}>
              <rect x={w.cx - r} y={w.cy + r - 2 * r * p} width={2 * r} height={2 * r * p} />
            </clipPath>
          )
        })}
      </defs>

      {/* ground shadow */}
      <ellipse cx={200} cy={GROUND_Y} rx={180} ry={3} fill="var(--car-stroke)" opacity={0.12} />

      {/* body base */}
      <path d={outline.body} fill="var(--car-body)" />
      <path d={outline.extras} fill="var(--car-body)" stroke="var(--car-stroke)" strokeWidth={1.2} strokeLinejoin="round" />

      {/* zone fills, clipped to the body */}
      <g clipPath={`url(#${clip('shell')})`}>
        {zones.map((z) =>
          z.kind === 'rect' ? (
            <g key={z.system}>
              <rect x={z.x} y={z.y} width={z.w} height={z.h} fill="var(--zone-empty)" opacity={z.system === 'conversion' ? 0.9 : 0.7} />
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                fill={fillColor(progress[z.system])}
                opacity={0.78}
                clipPath={`url(#${clip(`fill-${z.system}`)})`}
              />
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                fill="none"
                stroke={z.system === 'conversion' ? 'var(--text)' : 'var(--car-body)'}
                strokeWidth={z.system === 'conversion' ? 1 : mini ? 1.5 : 2}
                strokeDasharray={z.system === 'conversion' ? '3 2' : undefined}
                opacity={z.system === 'conversion' ? 0.7 : 1}
              />
            </g>
          ) : null,
        )}
      </g>

      {/* details */}
      <path d={outline.wells} fill="var(--tire)" opacity={0.9} />
      <path d={outline.glass} fill="var(--glass)" opacity={0.55} stroke="var(--car-stroke)" strokeWidth={0.8} />
      <path d={outline.lines} fill="none" stroke="var(--car-stroke)" strokeWidth={0.8} opacity={0.6} strokeLinecap="round" />
      <path d={outline.dark} fill="var(--car-stroke)" opacity={0.85} />
      <path d={outline.lights} fill="var(--glass)" stroke="var(--car-stroke)" strokeWidth={0.8} />
      <path d={outline.tails} fill="var(--accent)" />
      <path d={outline.body} fill="none" stroke="var(--car-stroke)" strokeWidth={1.6} strokeLinejoin="round" />

      {/* wheels double as the suspension & brakes zone */}
      {WHEELS.map((w, i) => (
        <g key={i}>
          <circle cx={w.cx} cy={w.cy} r={w.r} fill="var(--tire)" />
          <circle cx={w.cx} cy={w.cy} r={w.r - 6} fill="var(--zone-empty)" />
          <circle
            cx={w.cx}
            cy={w.cy}
            r={w.r - 6}
            fill={fillColor(progress.suspension_brakes)}
            opacity={0.85}
            clipPath={`url(#${clip(`wheel-${i}`)})`}
          />
          <circle cx={w.cx} cy={w.cy} r={2} fill="var(--tire)" opacity={0.7} />
        </g>
      ))}

      {!mini && zones.map((z) => <ZoneLabel key={z.system} zone={z} p={progress[z.system]} />)}

      {interactive &&
        zones.map((z) => (
          <Link key={z.system} href={hrefFor!(z.system)} aria-label={zoneAriaLabel(z.system, progress[z.system])} className="group outline-none">
            {z.kind === 'rect' ? (
              <rect
                x={z.x}
                y={z.y}
                width={z.w}
                height={z.h}
                clipPath={`url(#${clip('shell')})`}
                className="fill-transparent stroke-transparent group-hover:fill-[color-mix(in_srgb,var(--text)_8%,transparent)] group-focus-visible:stroke-[var(--text)]"
                strokeWidth={2}
              />
            ) : (
              WHEELS.map((w, i) => (
                <circle
                  key={i}
                  cx={w.cx}
                  cy={w.cy}
                  r={w.r}
                  className="fill-transparent stroke-transparent group-hover:fill-[color-mix(in_srgb,var(--text)_8%,transparent)] group-focus-visible:stroke-[var(--text)]"
                  strokeWidth={2}
                />
              ))
            )}
          </Link>
        ))}
    </svg>
  )
}

function zoneAriaLabel(system: CarSystem, p?: SystemProgress) {
  return `${SYSTEM_LABELS[system]}: ${p?.done ?? 0} of ${p?.total ?? 0} parts have or installed`
}

function ZoneLabel({ zone, p }: { zone: Zone; p?: SystemProgress }) {
  const text = p && p.total > 0 ? `${p.done}/${p.total}` : '–'
  return (
    <g pointerEvents="none" textAnchor="middle" className="tabular">
      <text
        x={zone.label.x}
        y={zone.label.y}
        fontSize={11}
        fontWeight={650}
        fill="var(--text)"
        stroke="var(--car-body)"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {text}
      </text>
    </g>
  )
}
