// ============================================================================
// STUB: extractListingFromImage
// ----------------------------------------------------------------------------
// Later: send a listing screenshot or receipt photo to the Claude API (vision)
// from a server action and return structured fields to prefill Quick add.
// Keep the return shape stable so the sheet can merge it without changes.
// Not implemented in v1: always returns null, and nothing is sent anywhere.
// ============================================================================

export type ExtractedListing = {
  title?: string
  price_cents?: number
  shipping_cents?: number
  seller_name?: string
  source?: 'ebay' | 'fb_marketplace' | 'craigslist' | 'forum' | 'vendor' | 'other'
  listing_url?: string
  /** Model's confidence 0–1, so the UI can ask for a check when low. */
  confidence?: number
}

export async function extractListingFromImage(file: File): Promise<ExtractedListing | null> {
  void file // TODO(claude-api): implement via a server action; keep API keys server-side.
  return null
}
