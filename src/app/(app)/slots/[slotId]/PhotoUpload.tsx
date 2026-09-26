'use client'

import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { resizeImage } from '@/lib/images'
import { createClient } from '@/lib/supabase/client'
import { addAttachment } from '../actions'

export function PhotoUpload({ householdId, entityType, entityId }: { householdId: string; entityType: 'slot' | 'acquisition'; entityId: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setError(null)
    for (const file of Array.from(files)) {
      const blob = await resizeImage(file)
      const path = `${householdId}/${entityType}/${entityId}/${crypto.randomUUID()}.jpg`
      const up = await createClient().storage.from('photos').upload(path, blob, { contentType: blob.type || 'image/jpeg' })
      if (up.error) {
        setError('A photo didn’t upload. Try again.')
        continue
      }
      const res = await addAttachment({ entity_type: entityType, entity_id: entityId, storage_path: path })
      if (res.error) setError(res.error)
    }
    setBusy(false)
  }

  return (
    <div>
      <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-border bg-bg text-muted hover:text-text">
        <span className="flex flex-col items-center gap-1 text-xs">
          {busy ? <Loader2 size={20} className="animate-spin" aria-hidden /> : <Camera size={20} aria-hidden />}
          {busy ? 'Uploading…' : 'Add photos'}
        </span>
        <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => onFiles(e.target.files)} />
      </label>
      {error && <p role="alert" className="mt-1 text-xs text-accent-strong">{error}</p>}
    </div>
  )
}
