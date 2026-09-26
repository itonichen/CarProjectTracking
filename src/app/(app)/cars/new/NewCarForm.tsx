'use client'

import { useActionState, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ENGINE_LABELS, ENGINE_VARIANTS, GENERATION_INFO, SYSTEM_LABELS, generationForYear, type CarSystem, type EngineVariant } from '@/lib/domain'
import { buildSlotRows } from '@/lib/templates.apply'
import { createCar, type NewCarState } from './actions'

const field = 'mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none focus:border-accent'

export function NewCarForm({ builders }: { builders: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<NewCarState, FormData>(createCar, {})
  const [year, setYear] = useState(1994)
  const [original, setOriginal] = useState<EngineVariant>('6G72_DOHC_NA')
  const [target, setTarget] = useState<EngineVariant>('6G72_DOHC_TT')

  const generation = generationForYear(year)
  const plan = generation ? buildSlotRows({ generation, original_engine_variant: original, target_engine_variant: target }) : null
  const counts = new Map<CarSystem, number>()
  for (const s of plan?.slots ?? []) counts.set(s.system, (counts.get(s.system) ?? 0) + 1)
  const err = (name: string) => state.errors?.[name]?.[0]

  return (
    <form action={action} className="space-y-4">
      <Field label="Nickname" error={err('nickname')}>
        <input name="nickname" required placeholder="Red '94" className={field} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Year" error={err('year')}>
          <input name="year" type="number" inputMode="numeric" min={1991} max={1999} value={year} onChange={(e) => setYear(Number(e.target.value))} className={field} />
        </Field>
        <Field label="Trim">
          <input name="trim" placeholder="SL" className={field} />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-muted">
        {generation ? `${GENERATION_INFO[generation].label}: ${GENERATION_INFO[generation].look}` : 'Enter a year from 1991 to 1999'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Engine now">
          <select name="original_engine_variant" value={original} onChange={(e) => setOriginal(e.target.value as EngineVariant)} className={field}>
            {ENGINE_VARIANTS.map((v) => (
              <option key={v} value={v}>{ENGINE_LABELS[v]}</option>
            ))}
          </select>
        </Field>
        <Field label="Building to">
          <select name="target_engine_variant" value={target} onChange={(e) => setTarget(e.target.value as EngineVariant)} className={field}>
            {ENGINE_VARIANTS.map((v) => (
              <option key={v} value={v}>{ENGINE_LABELS[v]}</option>
            ))}
          </select>
        </Field>
      </div>

      {plan?.warnings.map((w) => (
        <p key={w} role="alert" className="flex gap-2 rounded-xl bg-warn-soft px-3 py-2 text-sm text-warn">
          <TriangleAlert aria-hidden size={16} className="mt-0.5 shrink-0" />
          {w}
        </p>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Drivetrain">
          <select name="drivetrain" defaultValue="FWD" className={field}>
            <option>FWD</option>
            <option>AWD</option>
          </select>
        </Field>
        <Field label="Color">
          <input name="color" className={field} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Budget ($)" error={err('budget')}>
          <input name="budget" inputMode="decimal" placeholder="15,000" className={field} />
        </Field>
        <Field label="VIN" error={err('vin')}>
          <input name="vin" maxLength={17} autoCapitalize="characters" className={field} />
        </Field>
      </div>

      {builders.length > 0 && (
        <Field label="Engine builder">
          <select name="builder_id" defaultValue="" className={field}>
            <option value="">None</option>
            {builders.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>
      )}

      {plan && (
        <section className="rounded-xl border border-border bg-surface p-3">
          <h2 className="text-sm font-semibold">
            {plan.slots.length} part slots will be created
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {[...counts].map(([system, n]) => (
              <li key={system} className="flex justify-between">
                <span className="text-muted">{SYSTEM_LABELS[system]}</span>
                <span className="tabular">{n}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.message && <p role="alert" className="text-sm text-accent-strong">{state.message}</p>}
      <button disabled={pending || !generation} className="h-12 w-full rounded-xl bg-accent font-semibold text-white disabled:opacity-60">
        {pending ? 'Adding…' : 'Add car'}
      </button>
    </form>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-accent-strong">{error}</span>}
    </label>
  )
}
