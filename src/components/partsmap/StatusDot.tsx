import type { BuildStatus } from '@/lib/domain'

const LABEL: Record<BuildStatus, string> = { needed: 'Needed', sourcing: 'Sourcing', have: 'Have', installed: 'Installed' }

/** installed = solid ink, have = ink ring, needed = solid red, sourcing = red ring. */
export function StatusDot({ status, size = 12 }: { status: BuildStatus; size?: number }) {
  const ring = status === 'have' || status === 'sourcing'
  const color = status === 'needed' || status === 'sourcing' ? 'var(--accent)' : 'var(--text)'
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, background: ring ? 'transparent' : color, boxShadow: ring ? `inset 0 0 0 2px ${color}` : undefined }}
    />
  )
}

export function statusLabel(s: BuildStatus) {
  return LABEL[s]
}
