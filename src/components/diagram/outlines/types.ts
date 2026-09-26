/**
 * One generation's side-profile drawing. All outlines share the viewBox and
 * zone layout in ../zones.ts (nose left, ground at y=134), so gen1/gen3 are
 * just new path sets with the wheels in the same places.
 */
export type Outline = {
  /** Full silhouette including wheel arch cut-outs. Filled and stroked. */
  body: string
  /** Silhouette with arches filled in. Zones are clipped to this. */
  shell: string
  /** Wheel wells: drawn dark over the zones, behind the tires. */
  wells: string
  /** Side glass (drawn translucent over zone fills). */
  glass: string
  /** Thin detail lines: door cuts, pillars, bumper seams. */
  lines: string
  /** Solid dark details: scoops, grille, vents. */
  dark: string
  /** Headlight lenses. */
  lights: string
  /** Tail light lenses. */
  tails: string
  /** Parts drawn outside the body silhouette (e.g. rear wing). Filled like body. */
  extras: string
}

export const WHEELS = [
  { cx: 106, cy: 113, r: 21 },
  { cx: 298, cy: 113, r: 21 },
] as const

/** Cropped tight to the drawing so it fills a phone screen. */
export const VIEWBOX = { x: 10, y: 28, width: 380, height: 110 }
export const GROUND_Y = 134
