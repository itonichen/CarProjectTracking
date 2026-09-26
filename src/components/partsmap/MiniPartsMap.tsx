import type { Progress } from '@/lib/partsmap/stats'
import { LINEART, SIDE_VIEWBOX, ZONES, type ZoneId } from '@/lib/partsmap/zones'
import { Shape } from './Shape'

/**
 * Garage-card thumbnail: the line art with each zone tinted red in
 * proportion to how much it still needs. Finished zones are left clear.
 */
export function MiniPartsMap({ progress, label }: { progress: Partial<Record<ZoneId, Progress>>; label: string }) {
  const vb = SIDE_VIEWBOX
  return (
    <svg viewBox={`${vb.x} ${vb.y} ${vb.width} ${vb.height}`} role="img" aria-label={label} className="block h-auto w-full">
      <image href={LINEART.href} x={0} y={0} width={LINEART.width} height={LINEART.height} style={{ filter: 'var(--lineart-filter)' }} />
      {ZONES.filter((z) => z.id !== 'drivetrain').map((z) => {
        const p = progress[z.id]
        const open = p && p.total ? p.open / p.total : 0
        return z.shapes.map((sh, i) => <Shape key={`${z.id}-${i}`} shape={sh} fill="var(--accent)" fillOpacity={open * 0.32} />)
      })}
    </svg>
  )
}
