// Every slot template lives here. Edit freely: templates only run when a car
// is created, so changes affect new cars, not existing ones.
//
// Fields
//   key          stable id, unique within its template (becomes part_slots.template_key)
//   qty          required_qty
//   dest         'builder' (engine builder's scope) or 'car' (installed at home)
//   notes        fitment_notes
//   fits         'generation' = limited to the car's generation years,
//                [from, to]   = explicit inclusive year range,
//                omitted      = no known restriction
//   review       mark this slot needs_review
//   zone         where it sits on the parts map side view (src/lib/partsmap/zones.ts)
//   bay          engine-bay component in the top-down view, if any

import type { CarSystem, Destination } from './domain'
import type { BayId, ZoneId } from './partsmap/zones'

export type SlotTemplate = {
  key: string
  system: CarSystem
  subsystem?: string
  name: string
  qty: number
  dest: Destination
  notes?: string
  fits?: 'generation' | [number, number]
  review?: boolean
  zone: ZoneId
  bay?: BayId
}

export type Template = {
  key: string
  label: string
  /** Mark every slot in this template needs_review (placeholder templates). */
  review?: boolean
  slots: SlotTemplate[]
}

// Helpers keep the lists below readable.
const engine = (subsystem: string, rows: [key: string, name: string, qty: number, notes?: string][]): SlotTemplate[] =>
  rows.map(([key, name, qty, notes]) => ({ key, system: 'engine', subsystem, name, qty, dest: 'builder', notes, zone: 'engine', bay: 'engine-core' }))

// ---------------------------------------------------------------------------
// Engine: 6G72 DOHC twin turbo (the build target for most cars)
// ---------------------------------------------------------------------------

export const ENGINE_6G72_DOHC_TT: Template = {
  key: 'engine_6G72_DOHC_TT',
  label: '6G72 DOHC twin turbo engine',
  slots: [
    ...engine('Short block', [
      ['block', 'Engine block', 1],
      ['crank', 'Crankshaft', 1],
      ['rods', 'Connecting rods', 6],
      ['pistons', 'Pistons', 6, '8:1 compression for turbo. Non-turbo DOHC pistons are 10:1 and will not work.'],
      ['rings', 'Piston ring sets', 6],
      ['main_bearings', 'Main bearing set', 1],
      ['rod_bearings', 'Rod bearing set', 1],
      ['thrust_washer', 'Thrust washer', 1],
    ]),
    ...engine('Heads', [
      ['heads', 'Cylinder heads', 2],
      ['valves', 'Valves', 24],
      ['valve_springs', 'Valve springs', 24],
      ['valve_guides', 'Valve guides', 24],
      ['cams', 'Camshafts', 4],
      ['lifters', 'Lifters', 24],
    ]),
    ...engine('Timing', [
      ['timing_belt', 'Timing belt', 1],
      ['tensioner', 'Tensioner pulley', 1],
      ['idlers', 'Idler pulleys', 1, 'Confirm count with builder.'],
      ['hyd_adjuster', 'Hydraulic tensioner adjuster', 1],
    ]),
    ...engine('Gaskets', [
      ['head_gaskets', 'Head gaskets', 2],
      ['gasket_set', 'Full gasket set', 1],
    ]),
    ...engine('Oiling', [
      ['oil_pump', 'Oil pump', 1],
      ['oil_pickup', 'Oil pickup', 1],
    ]),
    ...engine('Cooling', [
      ['water_pump', 'Water pump', 1],
      ['thermostat', 'Thermostat', 1],
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Engine placeholders. Lighter lists; every slot needs review.
// ---------------------------------------------------------------------------

export const ENGINE_6G72_DOHC_NA: Template = {
  key: 'engine_6G72_DOHC_NA',
  label: '6G72 DOHC non-turbo engine (placeholder)',
  review: true,
  slots: [
    ...engine('Short block', [
      ['pistons', 'Pistons', 6, '10:1 compression (non-turbo).'],
      ['rings', 'Piston ring sets', 6],
      ['main_bearings', 'Main bearing set', 1],
      ['rod_bearings', 'Rod bearing set', 1],
    ]),
    ...engine('Heads', [
      ['valves', 'Valves', 24],
      ['valve_springs', 'Valve springs', 24],
      ['lifters', 'Lifters', 24],
    ]),
    ...engine('Timing', [
      ['timing_belt', 'Timing belt', 1],
      ['tensioner', 'Tensioner pulley', 1],
      ['hyd_adjuster', 'Hydraulic tensioner adjuster', 1],
    ]),
    ...engine('Gaskets', [
      ['head_gaskets', 'Head gaskets', 2],
      ['gasket_set', 'Full gasket set', 1],
    ]),
    ...engine('Cooling', [['water_pump', 'Water pump', 1]]),
  ],
}

export const ENGINE_6G72_SOHC: Template = {
  key: 'engine_6G72_SOHC',
  label: '6G72 SOHC engine (placeholder)',
  review: true,
  slots: [
    ...engine('Short block', [
      ['pistons', 'Pistons', 6],
      ['rings', 'Piston ring sets', 6],
      ['main_bearings', 'Main bearing set', 1],
      ['rod_bearings', 'Rod bearing set', 1],
    ]),
    ...engine('Heads', [
      ['valves', 'Valves', 12, 'SOHC is 12-valve.'],
      ['cams', 'Camshafts', 2],
      ['lash_adjusters', 'Lash adjusters', 12],
    ]),
    ...engine('Timing', [
      ['timing_belt', 'Timing belt', 1],
      ['tensioner', 'Tensioner pulley', 1],
    ]),
    ...engine('Gaskets', [
      ['head_gaskets', 'Head gaskets', 2],
      ['gasket_set', 'Full gasket set', 1],
    ]),
    ...engine('Cooling', [['water_pump', 'Water pump', 1]]),
  ],
}

// ---------------------------------------------------------------------------
// Twin turbo conversion (DOHC NA -> DOHC TT)
// ---------------------------------------------------------------------------

type Row = [key: string, name: string, qty: number, dest: Destination, zone: ZoneId, bay?: BayId, notes?: string]

const conv = (subsystem: string, rows: Row[], system: CarSystem = 'conversion', review = false): SlotTemplate[] =>
  rows.map(([key, name, qty, dest, zone, bay, notes]) => ({ key, system, subsystem, name, qty, dest, zone, bay, notes, review }))

const AWD_NOTE = 'AWD / VR-4 only. These cars are FWD, so only needed if the build goes AWD.'

export const CONVERSION_TT: Template = {
  key: 'conversion_TT',
  label: 'Twin turbo conversion',
  slots: [
    ...conv('Turbos & manifolds', [
      ['turbo_front', 'TD04 turbo with wastegate actuator, front bank', 1, 'builder', 'engine', 'turbo-front'],
      ['turbo_rear', 'TD04 turbo with wastegate actuator, rear bank', 1, 'builder', 'engine', 'turbo-rear'],
      ['exh_manifold_front', 'VR-4 exhaust manifold, front bank', 1, 'builder', 'engine', 'turbo-front'],
      ['exh_manifold_rear', 'VR-4 exhaust manifold, rear bank', 1, 'builder', 'engine', 'turbo-rear'],
      ['manifold_gaskets', 'Exhaust manifold gaskets (set)', 1, 'builder', 'engine'],
    ]),
    ...conv('Turbo oiling', [
      ['oil_housing', 'Oil housing', 1, 'builder', 'engine', 'engine-core'],
      ['turbo_oil_lines_front', 'Turbo oil feed & return, front bank (lines, eyebolts, gaskets)', 1, 'builder', 'engine', 'turbo-front'],
      ['turbo_oil_lines_rear', 'Turbo oil feed & return, rear bank (lines, eyebolts, gaskets)', 1, 'builder', 'engine', 'turbo-rear'],
      ['rear_oil_feed', 'Rear oil feed joint', 1, 'builder', 'engine', 'turbo-rear'],
      ['oil_pan', 'Oil pan modified for turbo returns', 1, 'builder', 'engine', 'engine-core'],
    ]),
    ...conv('Turbo cooling', [
      ['water_housing', 'Water housing', 1, 'builder', 'engine', 'engine-core'],
      ['turbo_coolant_lines', 'Turbo coolant lines with eyebolts, washers and gaskets (set)', 1, 'builder', 'engine', 'engine-core'],
    ]),
    ...conv('Exhaust', [
      ['o2_housings', 'O2 housings', 2, 'car', 'engine'],
      ['precats', 'Pre-cats', 2, 'car', 'engine'],
      ['downpipe', 'Front pipe / downpipe', 1, 'car', 'engine', 'turbo-rear', 'Must match pre-cat generation.'],
      ['catback', 'Twin-turbo cat-back exhaust', 1, 'car', 'rear-end'],
    ]),
    ...conv('Fuel', [
      ['injectors', '360cc injectors', 6, 'car', 'engine', 'engine-core'],
      ['fuel_pump', 'VR-4 fuel pump', 1, 'car', 'engine', 'engine-core'],
      ['resistor_pack', 'Injector resistor pack', 1, 'car', 'engine'],
      ['fuel_controller', 'Fuel controller', 1, 'car', 'cabin'],
    ]),
    ...conv('Intake & intercooling', [
      ['intercoolers', 'Side-mount intercoolers', 2, 'car', 'engine', 'intercoolers'],
      ['ic_piping', 'Intercooler piping (set)', 1, 'car', 'engine', 'ic-piping'],
      ['couplers', 'Intercooler couplers & clamps', 1, 'car', 'engine', 'ic-piping'],
      ['bov', 'Blow-off valve', 1, 'car', 'engine', 'ic-piping'],
      ['plenum', 'Twin-turbo intake plenum', 1, 'car', 'engine', 'intake'],
      ['ic_ducts', 'Intercooler ducts & brackets', 1, 'car', 'front-end'],
    ]),
    ...conv('Mounts & oil cooler', [
      ['front_mount', 'Front motor mount bracket', 1, 'car', 'engine'],
      ['oil_cooler', 'Oil cooler with lines', 1, 'car', 'front-end'],
    ]),
    ...conv('Gauges & engine management', [
      ['tt_ecu', 'Twin-turbo ECU', 1, 'car', 'cabin'],
      ['boost_gauge', 'Boost gauge', 1, 'car', 'cabin'],
      ['afr_gauge', 'Air/fuel gauge', 1, 'car', 'cabin'],
      ['egt_gauges', 'EGT gauges (one per bank)', 2, 'car', 'cabin'],
    ]),
    // From the parts-map design. Kept for the record, marked for review.
    ...conv(
      'AWD / VR-4 drivetrain',
      [
        ['awd_transaxle', 'Getrag 6-speed AWD transaxle', 1, 'car', 'drivetrain', 'transaxle', AWD_NOTE],
        ['transfer_case', 'Transfer case', 1, 'car', 'drivetrain', 'transaxle', AWD_NOTE],
        ['driveshaft', 'Driveshaft', 1, 'car', 'drivetrain', undefined, AWD_NOTE],
        ['rear_diff', 'Rear differential', 1, 'car', 'drivetrain', undefined, AWD_NOTE],
        ['rear_axles', 'Rear axles', 2, 'car', 'drivetrain', undefined, AWD_NOTE],
        ['awd_rear_hubs', 'AWD rear hubs', 2, 'car', 'wheel-rear', undefined, AWD_NOTE],
        ['shifter_6speed', '6-speed shifter & cables', 1, 'car', 'cabin', undefined, AWD_NOTE],
        ['vr4_cluster', 'VR-4 gauge cluster', 1, 'car', 'cabin', undefined, 'VR-4 part; confirm it works with the FWD harness.'],
      ],
      'conversion',
      true,
    ),
  ],
}

// ---------------------------------------------------------------------------
// Other systems. Applied to every car.
// ---------------------------------------------------------------------------

export const BASE_SYSTEMS: Template = {
  key: 'base',
  label: 'Other systems',
  slots: [
    { key: 'air_filter', system: 'turbo_intake', subsystem: 'Intake', name: 'Air filter', qty: 1, dest: 'car', zone: 'engine', bay: 'intake' },
    { key: 'maf_airbox', system: 'turbo_intake', subsystem: 'Intake', name: 'MAF & airbox', qty: 1, dest: 'car', zone: 'engine', bay: 'intake' },
    { key: 'throttle_body', system: 'turbo_intake', subsystem: 'Intake', name: 'Throttle body', qty: 1, dest: 'car', zone: 'engine', bay: 'intake' },
    { key: 'intake_hoses', system: 'turbo_intake', subsystem: 'Intake', name: 'Intake hoses and clamps (set)', qty: 1, dest: 'car', zone: 'engine', bay: 'intake' },
    { key: 'throttle_body_gasket', system: 'turbo_intake', subsystem: 'Intake', name: 'Throttle body gasket', qty: 1, dest: 'car', zone: 'engine', bay: 'intake' },

    { key: 'fuel_filter', system: 'fuel', subsystem: 'Supply', name: 'Fuel filter', qty: 1, dest: 'car', zone: 'engine' },
    { key: 'fpr', system: 'fuel', subsystem: 'Supply', name: 'Fuel pressure regulator', qty: 1, dest: 'car', zone: 'engine', bay: 'engine-core' },
    { key: 'fuel_hoses', system: 'fuel', subsystem: 'Supply', name: 'Fuel hoses (set)', qty: 1, dest: 'car', zone: 'engine' },

    { key: 'radiator', system: 'cooling', subsystem: 'Radiator', name: 'Radiator', qty: 1, dest: 'car', zone: 'engine', bay: 'radiator' },
    { key: 'radiator_hoses', system: 'cooling', subsystem: 'Radiator', name: 'Radiator hoses (upper and lower)', qty: 2, dest: 'car', zone: 'engine', bay: 'radiator' },
    { key: 'fans', system: 'cooling', subsystem: 'Radiator', name: 'Cooling fans', qty: 2, dest: 'car', zone: 'engine', bay: 'radiator' },
    { key: 'coolant_reservoir', system: 'cooling', subsystem: 'Radiator', name: 'Coolant reservoir', qty: 1, dest: 'car', zone: 'engine' },

    { key: 'clutch', system: 'drivetrain', subsystem: 'Clutch', name: 'Clutch kit', qty: 1, dest: 'car', zone: 'drivetrain', bay: 'transaxle', notes: 'Must be rated for the target engine’s torque.' },
    { key: 'flywheel', system: 'drivetrain', subsystem: 'Clutch', name: 'Flywheel', qty: 1, dest: 'car', zone: 'drivetrain', bay: 'transaxle' },
    { key: 'clutch_release_cylinder', system: 'drivetrain', subsystem: 'Clutch', name: 'Clutch release (slave) cylinder', qty: 1, dest: 'car', zone: 'drivetrain', bay: 'transaxle', notes: 'Linked diagram is from the AWD (W5MG1/W6MG1) manual; confirm the FWD part before ordering.' },
    { key: 'clutch_damper', system: 'drivetrain', subsystem: 'Clutch', name: 'Clutch damper', qty: 1, dest: 'car', zone: 'drivetrain', bay: 'transaxle', notes: 'Sits in the hydraulic line. Linked diagram is from the AWD manual; confirm the FWD part before ordering.' },
    { key: 'axles', system: 'drivetrain', subsystem: 'Axles', name: 'CV axles', qty: 2, dest: 'car', zone: 'drivetrain', notes: 'FWD vs AWD axles differ.' },
    { key: 'trans_fluid', system: 'drivetrain', subsystem: 'Transmission', name: 'Transmission fluid', qty: 1, dest: 'car', zone: 'drivetrain', bay: 'transaxle' },

    { key: 'wheels_front', system: 'suspension_brakes', subsystem: 'Wheels', name: 'Wheels & tires, front', qty: 2, dest: 'car', zone: 'wheel-front' },
    { key: 'wheels_rear', system: 'suspension_brakes', subsystem: 'Wheels', name: 'Wheels & tires, rear', qty: 2, dest: 'car', zone: 'wheel-rear' },
    { key: 'calipers_front', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Front calipers', qty: 2, dest: 'car', zone: 'wheel-front' },
    { key: 'calipers_rear', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Rear calipers', qty: 2, dest: 'car', zone: 'wheel-rear' },
    { key: 'rotors_front', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Front brake rotors', qty: 2, dest: 'car', zone: 'wheel-front' },
    { key: 'rotors_rear', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Rear brake rotors', qty: 2, dest: 'car', zone: 'wheel-rear' },
    { key: 'front_pads', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Front brake pads', qty: 1, dest: 'car', zone: 'wheel-front' },
    { key: 'rear_pads', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Rear brake pads', qty: 1, dest: 'car', zone: 'wheel-rear' },
    { key: 'brake_lines', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Brake lines (set)', qty: 1, dest: 'car', zone: 'wheel-front' },
    { key: 'struts_front', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Struts / coilovers, front', qty: 2, dest: 'car', zone: 'wheel-front' },
    { key: 'struts_rear', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Struts / coilovers, rear', qty: 2, dest: 'car', zone: 'wheel-rear' },
    { key: 'hubs_front', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Front hubs & bearings', qty: 2, dest: 'car', zone: 'wheel-front' },
    { key: 'control_arms', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Front control arms', qty: 2, dest: 'car', zone: 'wheel-front' },
    { key: 'trailing_arms', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Rear trailing arms', qty: 2, dest: 'car', zone: 'wheel-rear' },
    { key: 'bushings', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Sway bar bushings (set)', qty: 1, dest: 'car', zone: 'wheel-front' },

    { key: 'battery', system: 'electrical', subsystem: 'Power', name: 'Battery', qty: 1, dest: 'car', zone: 'engine', bay: 'battery' },
    { key: 'spark_plugs', system: 'electrical', subsystem: 'Ignition', name: 'Spark plugs', qty: 6, dest: 'car', zone: 'engine', bay: 'engine-core' },
    { key: 'coil_packs', system: 'electrical', subsystem: 'Ignition', name: 'Ignition coil packs', qty: 3, dest: 'car', zone: 'engine', bay: 'engine-core' },
    { key: 'plug_wires', system: 'electrical', subsystem: 'Ignition', name: 'Spark plug wires (set)', qty: 1, dest: 'car', zone: 'engine', bay: 'engine-core' },

    { key: 'headlights', system: 'body', subsystem: 'Lighting', name: 'Projector headlights', qty: 2, dest: 'car', zone: 'lighting', fits: 'generation', notes: 'Gen 1 pop-ups, gen 2 fixed projectors and gen 3 units are not interchangeable.' },
    { key: 'side_marker_left', system: 'body', subsystem: 'Lighting', name: 'Side marker, left', qty: 1, dest: 'car', zone: 'lighting' },
    { key: 'side_marker_right', system: 'body', subsystem: 'Lighting', name: 'Side marker, right', qty: 1, dest: 'car', zone: 'lighting' },
    { key: 'fog_lamps', system: 'body', subsystem: 'Lighting', name: 'Fog lamps', qty: 2, dest: 'car', zone: 'front-end' },
    { key: 'front_bumper', system: 'body', subsystem: 'Front', name: 'Front bumper cover', qty: 1, dest: 'car', zone: 'front-end', fits: 'generation', notes: 'Twin turbo builds: the VR-4 cover has openings that feed the side-mount intercoolers.' },
    { key: 'front_lip', system: 'body', subsystem: 'Front', name: 'Front lip / air dam', qty: 1, dest: 'car', zone: 'front-end' },
    { key: 'door_shells', system: 'body', subsystem: 'Doors & sides', name: 'Door shells', qty: 2, dest: 'car', zone: 'body-side' },
    { key: 'door_handles', system: 'body', subsystem: 'Doors & sides', name: 'Door handles', qty: 2, dest: 'car', zone: 'body-side' },
    { key: 'mirrors', system: 'body', subsystem: 'Doors & sides', name: 'Power mirrors', qty: 2, dest: 'car', zone: 'body-side' },
    { key: 'side_skirts', system: 'body', subsystem: 'Doors & sides', name: 'Side skirts', qty: 2, dest: 'car', zone: 'body-side' },
    { key: 'weatherstrip', system: 'body', subsystem: 'Doors & sides', name: 'Door weatherstripping (pair)', qty: 1, dest: 'car', zone: 'body-side' },
    { key: 'side_vent_left', system: 'body', subsystem: 'Doors & sides', name: 'Side vent, left', qty: 1, dest: 'car', zone: 'side-vent', fits: [1994, 1999] },
    { key: 'side_vent_right', system: 'body', subsystem: 'Doors & sides', name: 'Side vent, right', qty: 1, dest: 'car', zone: 'side-vent', fits: [1994, 1999] },
    { key: 'rear_wing', system: 'body', subsystem: 'Rear', name: 'Rear wing', qty: 1, dest: 'car', zone: 'hatch', fits: 'generation' },
    { key: 'hatch_glass', system: 'body', subsystem: 'Rear', name: 'Hatch glass', qty: 1, dest: 'car', zone: 'hatch' },
    { key: 'hatch_struts', system: 'body', subsystem: 'Rear', name: 'Hatch struts', qty: 2, dest: 'car', zone: 'hatch' },
    { key: 'third_brake_light', system: 'body', subsystem: 'Rear', name: 'Third brake light', qty: 1, dest: 'car', zone: 'hatch' },
    { key: 'rear_bumper', system: 'body', subsystem: 'Rear', name: 'Rear bumper cover', qty: 1, dest: 'car', zone: 'rear-end', fits: 'generation' },
    { key: 'taillight_bar', system: 'body', subsystem: 'Rear', name: 'Full-width taillight bar', qty: 1, dest: 'car', zone: 'rear-end', fits: 'generation' },

    { key: 'carpet', system: 'interior', subsystem: 'Cabin', name: 'Carpet', qty: 1, dest: 'car', zone: 'cabin' },
    { key: 'seat_covers', system: 'interior', subsystem: 'Cabin', name: 'Seat upholstery (front pair)', qty: 1, dest: 'car', zone: 'cabin' },
    { key: 'dash_cap', system: 'interior', subsystem: 'Cabin', name: 'Dash cover', qty: 1, dest: 'car', zone: 'cabin' },
  ],
}

export const ENGINE_TEMPLATES = {
  '6G72_SOHC': ENGINE_6G72_SOHC,
  '6G72_DOHC_NA': ENGINE_6G72_DOHC_NA,
  '6G72_DOHC_TT': ENGINE_6G72_DOHC_TT,
} as const
