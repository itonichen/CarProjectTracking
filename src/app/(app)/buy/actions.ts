'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireHousehold } from '@/lib/session'

/** Move a part to the household's "bought" status (first have-status not at the builder). */
export async function markBought(slotId: string): Promise<{ ok: boolean; label?: string }> {
  if (!z.uuid().safeParse(slotId).success) return { ok: false }
  const { supabase } = await requireHousehold()
  const { data: status } = await supabase
    .from('part_statuses')
    .select('id, label')
    .eq('category', 'have')
    .eq('at_builder', false)
    .order('sort_order')
    .limit(1)
    .maybeSingle()
  const update = status ? { status_id: status.id } : { build_status: 'have' }
  const { error } = await supabase.from('part_slots').update(update).eq('id', slotId)
  if (error) return { ok: false }
  revalidatePath('/', 'layout')
  return { ok: true, label: status?.label ?? 'Have' }
}
