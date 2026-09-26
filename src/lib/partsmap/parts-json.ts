// Maps the parts-map design's parts.json (one car's real part statuses) onto
// template slots. Some design parts cover two slots (rotors & pads), and some
// slots cover two design parts (left and right headlights). When design parts
// that share a slot disagree, the slot takes the least-done status.

import type { BuildStatus } from '../domain'

export const PARTS_JSON_TO_TEMPLATE: Record<string, string[]> = {
  // front-end
  'vr4-bumper': ['base:front_bumper'],
  'ic-ducts': ['conversion_TT:ic_ducts'],
  'front-lip': ['base:front_lip'],
  'fog-lamps': ['base:fog_lamps'],
  // lighting
  'hl-l': ['base:headlights'],
  'hl-r': ['base:headlights'],
  'marker-l': ['base:side_marker_left'],
  'marker-r': ['base:side_marker_right'],
  // engine
  'tt-f': ['conversion_TT:turbo_front'],
  'mani-f': ['conversion_TT:exh_manifold_front'],
  'oil-f': ['conversion_TT:turbo_oil_lines_front'],
  'tt-r': ['conversion_TT:turbo_rear'],
  'mani-r': ['conversion_TT:exh_manifold_rear'],
  'oil-r': ['conversion_TT:turbo_oil_lines_rear'],
  downpipe: ['conversion_TT:downpipe'],
  'ic-l': ['conversion_TT:intercoolers'],
  'ic-r': ['conversion_TT:intercoolers'],
  'ic-pipes': ['conversion_TT:ic_piping'],
  couplers: ['conversion_TT:couplers'],
  bov: ['conversion_TT:bov'],
  plenum: ['conversion_TT:plenum'],
  tb: ['base:throttle_body'],
  maf: ['base:maf_airbox'],
  pistons: ['engine_6G72_DOHC_TT:pistons'],
  hg: ['engine_6G72_DOHC_TT:head_gaskets'],
  injectors: ['conversion_TT:injectors'],
  'fuel-pump': ['conversion_TT:fuel_pump'],
  coolant: ['conversion_TT:turbo_coolant_lines'],
  rad: ['base:radiator'],
  fans: ['base:fans'],
  batt: ['base:battery'],
  // wheel-front
  'wheels-f': ['base:wheels_front'],
  'calipers-f': ['base:calipers_front'],
  'rotors-f': ['base:rotors_front', 'base:front_pads'],
  'struts-f': ['base:struts_front'],
  'hubs-f': ['base:hubs_front'],
  'arms-f': ['base:control_arms'],
  // cabin
  ecu: ['conversion_TT:tt_ecu'],
  boost: ['conversion_TT:boost_gauge'],
  shifter: ['conversion_TT:shifter_6speed'],
  cluster: ['conversion_TT:vr4_cluster'],
  // body-side
  doors: ['base:door_shells'],
  mirrors: ['base:mirrors'],
  skirts: ['base:side_skirts'],
  handles: ['base:door_handles'],
  // side-vent
  'vent-l': ['base:side_vent_left'],
  'vent-r': ['base:side_vent_right'],
  // drivetrain
  trans: ['conversion_TT:awd_transaxle'],
  clutch: ['base:clutch', 'base:flywheel'],
  transfer: ['conversion_TT:transfer_case'],
  driveshaft: ['conversion_TT:driveshaft'],
  'rear-diff': ['conversion_TT:rear_diff'],
  'rear-axles': ['conversion_TT:rear_axles'],
  // wheel-rear
  'wheels-r': ['base:wheels_rear'],
  'calipers-r': ['base:calipers_rear'],
  'rotors-r': ['base:rotors_rear', 'base:rear_pads'],
  'struts-r': ['base:struts_rear'],
  'hubs-r': ['conversion_TT:awd_rear_hubs'],
  'arms-r': ['base:trailing_arms'],
  // hatch
  wing: ['base:rear_wing'],
  'hatch-glass': ['base:hatch_glass'],
  'hatch-struts': ['base:hatch_struts'],
  cbl: ['base:third_brake_light'],
  // rear-end
  'rear-bumper': ['base:rear_bumper'],
  taillight: ['base:taillight_bar'],
  catback: ['conversion_TT:catback'],
}

const RANK: Record<BuildStatus, number> = { needed: 0, sourcing: 1, have: 2, installed: 3 }

export type PartsJson = { zones: { parts: { id: string; name: string; status: string }[] }[] }

/** template_key -> status, merged least-done-wins. Unknown ids are returned separately. */
export function statusesFromPartsJson(doc: PartsJson): { byTemplate: Map<string, BuildStatus>; unmapped: string[] } {
  const byTemplate = new Map<string, BuildStatus>()
  const unmapped: string[] = []
  for (const part of doc.zones.flatMap((z) => z.parts)) {
    const keys = PARTS_JSON_TO_TEMPLATE[part.id]
    const status = part.status as BuildStatus
    if (!keys || !(status in RANK)) {
      unmapped.push(part.id)
      continue
    }
    for (const k of keys) {
      const prev = byTemplate.get(k)
      if (prev === undefined || RANK[status] < RANK[prev]) byTemplate.set(k, status)
    }
  }
  return { byTemplate, unmapped }
}
