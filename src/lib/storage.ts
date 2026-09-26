import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Signed URLs for private objects, keyed by path. Missing ones are omitted. */
export async function signedUrls(supabase: SupabaseClient, bucket: 'photos' | 'manuals', paths: string[], expiresIn = 3600) {
  if (!paths.length) return new Map<string, string>()
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, expiresIn)
  return new Map<string, string>((data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as [string, string]] : [])))
}
