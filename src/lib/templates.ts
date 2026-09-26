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

import type { CarSystem, Destination } from './domain'

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
  rows.map(([key, name, qty, notes]) => ({ key, system: 'engine', subsystem, name, qty, dest: 'builder', notes }))

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

const conv = (
  subsystem: string,
  rows: [key: string, name: string, qty: number, dest: Destination, notes?: string][],
): SlotTemplate[] =>
  rows.map(([key, name, qty, dest, notes]) => ({ key, system: 'conversion', subsystem, name, qty, dest, notes }))

export const CONVERSION_TT: Template = {
  key: 'conversion_TT',
  label: 'Twin turbo conversion',
  slots: [
    ...conv('Turbos & manifolds', [
      ['turbos', 'Turbos with wastegate actuators', 2, 'builder'],
      ['exh_manifolds', 'VR-4 exhaust manifolds', 2, 'builder'],
      ['manifold_gaskets', 'Exhaust manifold gaskets (set)', 1, 'builder'],
    ]),
    ...conv('Turbo oiling', [
      ['oil_housing', 'Oil housing', 1, 'builder'],
      ['turbo_oil_lines', 'Turbo oil feed/return lines with eyebolts and gaskets (set)', 1, 'builder'],
      ['rear_oil_feed', 'Rear oil feed joint', 1, 'builder'],
      ['oil_pan', 'Oil pan modified for turbo returns', 1, 'builder'],
    ]),
    ...conv('Turbo cooling', [
      ['water_housing', 'Water housing', 1, 'builder'],
      ['turbo_coolant_lines', 'Turbo coolant lines with eyebolts, washers and gaskets (set)', 1, 'builder'],
    ]),
    ...conv('Exhaust', [
      ['o2_housings', 'O2 housings', 2, 'car'],
      ['precats', 'Pre-cats', 2, 'car'],
      ['downpipe', 'Downpipe', 1, 'car', 'Must match pre-cat generation.'],
    ]),
    ...conv('Fuel', [
      ['injectors', '360cc injectors', 6, 'car'],
      ['fuel_pump', 'VR-4 fuel pump', 1, 'car'],
      ['resistor_pack', 'Injector resistor pack', 1, 'car'],
      ['fuel_controller', 'Fuel controller', 1, 'car'],
    ]),
    ...conv('Intercooling', [
      ['intercoolers', 'Intercoolers', 2, 'car'],
      ['ic_piping', 'Intercooler piping (set)', 1, 'car'],
    ]),
    ...conv('Mounts & oil cooler', [
      ['front_mount', 'Front motor mount bracket', 1, 'car'],
      ['oil_cooler', 'Oil cooler with lines', 1, 'car'],
    ]),
    ...conv('Gauges', [
      ['boost_gauge', 'Boost gauge', 1, 'car'],
      ['afr_gauge', 'Air/fuel gauge', 1, 'car'],
      ['egt_gauges', 'EGT gauges (one per bank)', 2, 'car'],
    ]),
  ],
}

// ---------------------------------------------------------------------------
// Other systems. Applied to every car.
// ---------------------------------------------------------------------------

export const BASE_SYSTEMS: Template = {
  key: 'base',
  label: 'Other systems',
  slots: [
    { key: 'air_filter', system: 'turbo_intake', subsystem: 'Intake', name: 'Air filter', qty: 1, dest: 'car' },
    { key: 'intake_hoses', system: 'turbo_intake', subsystem: 'Intake', name: 'Intake hoses and clamps (set)', qty: 1, dest: 'car' },
    { key: 'throttle_body_gasket', system: 'turbo_intake', subsystem: 'Intake', name: 'Throttle body gasket', qty: 1, dest: 'car' },

    { key: 'fuel_filter', system: 'fuel', subsystem: 'Supply', name: 'Fuel filter', qty: 1, dest: 'car' },
    { key: 'fpr', system: 'fuel', subsystem: 'Supply', name: 'Fuel pressure regulator', qty: 1, dest: 'car' },
    { key: 'fuel_hoses', system: 'fuel', subsystem: 'Supply', name: 'Fuel hoses (set)', qty: 1, dest: 'car' },

    { key: 'radiator', system: 'cooling', subsystem: 'Radiator', name: 'Radiator', qty: 1, dest: 'car' },
    { key: 'radiator_hoses', system: 'cooling', subsystem: 'Radiator', name: 'Radiator hoses (upper and lower)', qty: 2, dest: 'car' },
    { key: 'fans', system: 'cooling', subsystem: 'Radiator', name: 'Cooling fans', qty: 2, dest: 'car' },
    { key: 'coolant_reservoir', system: 'cooling', subsystem: 'Radiator', name: 'Coolant reservoir', qty: 1, dest: 'car' },

    { key: 'clutch', system: 'drivetrain', subsystem: 'Clutch', name: 'Clutch kit', qty: 1, dest: 'car', notes: 'Must be rated for the target engine’s torque.' },
    { key: 'flywheel', system: 'drivetrain', subsystem: 'Clutch', name: 'Flywheel', qty: 1, dest: 'car' },
    { key: 'axles', system: 'drivetrain', subsystem: 'Axles', name: 'CV axles', qty: 2, dest: 'car', notes: 'FWD vs AWD axles differ.' },
    { key: 'trans_fluid', system: 'drivetrain', subsystem: 'Transmission', name: 'Transmission fluid', qty: 1, dest: 'car' },

    { key: 'front_pads', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Front brake pads', qty: 1, dest: 'car' },
    { key: 'rear_pads', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Rear brake pads', qty: 1, dest: 'car' },
    { key: 'rotors', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Brake rotors', qty: 4, dest: 'car' },
    { key: 'brake_lines', system: 'suspension_brakes', subsystem: 'Brakes', name: 'Brake lines (set)', qty: 1, dest: 'car' },
    { key: 'struts', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Struts / coilovers', qty: 4, dest: 'car' },
    { key: 'bushings', system: 'suspension_brakes', subsystem: 'Suspension', name: 'Sway bar bushings (set)', qty: 1, dest: 'car' },

    { key: 'battery', system: 'electrical', subsystem: 'Power', name: 'Battery', qty: 1, dest: 'car' },
    { key: 'spark_plugs', system: 'electrical', subsystem: 'Ignition', name: 'Spark plugs', qty: 6, dest: 'car' },
    { key: 'coil_packs', system: 'electrical', subsystem: 'Ignition', name: 'Ignition coil packs', qty: 3, dest: 'car' },
    { key: 'plug_wires', system: 'electrical', subsystem: 'Ignition', name: 'Spark plug wires (set)', qty: 1, dest: 'car' },

    { key: 'headlights', system: 'body', subsystem: 'Front', name: 'Headlights', qty: 2, dest: 'car', fits: 'generation', notes: 'Gen 1 pop-ups, gen 2 fixed projectors and gen 3 units are not interchangeable.' },
    { key: 'front_bumper', system: 'body', subsystem: 'Front', name: 'Front bumper cover', qty: 1, dest: 'car', fits: 'generation' },
    { key: 'rear_wing', system: 'body', subsystem: 'Rear', name: 'Rear wing', qty: 1, dest: 'car', fits: 'generation' },
    { key: 'weatherstrip', system: 'body', subsystem: 'Seals', name: 'Door weatherstripping (pair)', qty: 1, dest: 'car' },

    { key: 'carpet', system: 'interior', subsystem: 'Cabin', name: 'Carpet', qty: 1, dest: 'car' },
    { key: 'seat_covers', system: 'interior', subsystem: 'Cabin', name: 'Seat upholstery (front pair)', qty: 1, dest: 'car' },
    { key: 'dash_cap', system: 'interior', subsystem: 'Cabin', name: 'Dash cover', qty: 1, dest: 'car' },
  ],
}

export const ENGINE_TEMPLATES = {
  '6G72_SOHC': ENGINE_6G72_SOHC,
  '6G72_DOHC_NA': ENGINE_6G72_DOHC_NA,
  '6G72_DOHC_TT': ENGINE_6G72_DOHC_TT,
} as const
