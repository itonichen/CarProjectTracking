import { ArrowRight } from 'lucide-react'
import { ENGINE_LABELS, GENERATION_INFO, type EngineVariant, type Generation } from '@/lib/domain'

/** Generation plus original -> target engine. Shown wherever a part is picked. */
export function EngineBadges({
  generation,
  original,
  target,
  year,
}: {
  generation: Generation
  original: EngineVariant
  target: EngineVariant
  year?: number
}) {
  const converting = original !== target
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-medium">
        {year ? `${year} · ` : ''}
        {GENERATION_INFO[generation].short}
      </span>
      <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5">
        {ENGINE_LABELS[original]}
        {converting && (
          <>
            <ArrowRight aria-label="converting to" size={12} />
            <span className="font-semibold text-accent-strong">{ENGINE_LABELS[target]}</span>
          </>
        )}
      </span>
    </span>
  )
}
