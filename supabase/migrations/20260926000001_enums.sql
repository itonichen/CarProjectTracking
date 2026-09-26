-- Domain enums. Values here must stay in sync with src/lib/domain.ts.

create type public.car_generation as enum (
  'gen1_1991_93', -- pop-up headlights
  'gen2_1994_96', -- fixed projector headlights
  'gen3_1997_99'  -- revised front bumper, larger wing
);

create type public.engine_variant as enum (
  '6G72_SOHC',
  '6G72_DOHC_NA',
  '6G72_DOHC_TT'
);

create type public.car_system as enum (
  'engine',
  'conversion',
  'turbo_intake',
  'fuel',
  'cooling',
  'drivetrain',
  'suspension_brakes',
  'electrical',
  'body',
  'interior'
);

create type public.slot_destination as enum ('builder', 'car');

-- The three part states are deliberately independent:
--   build_status    lives on part_slots
--   location_status lives on acquisitions
--   payment state   is derived from payment_allocations
create type public.build_status as enum ('needed', 'sourcing', 'have', 'installed');

create type public.location_status as enum (
  'with_seller',
  'in_transit_to_us',
  'at_home',
  'in_transit_to_builder',
  'at_builder',
  'installed',
  'returned',
  'sold'
);

create type public.acquisition_source as enum (
  'ebay', 'fb_marketplace', 'craigslist', 'forum', 'vendor', 'other'
);

create type public.payment_method as enum (
  'zelle', 'paypal', 'venmo', 'cash', 'card', 'other'
);

create type public.import_kind as enum ('sheet', 'venmo', 'paypal', 'bank');

create type public.attachment_entity as enum (
  'car', 'slot', 'acquisition', 'payment', 'shipment'
);
