-- Core tables. Every row carries household_id so RLS is one uniform check.
-- Composite foreign keys (id, household_id) stop a row from pointing at
-- another household's data even if a client sends a mismatched id.

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index household_members_user_idx on public.household_members(user_id);

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz
);

create table public.builders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, household_id)
);

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  nickname text not null,
  year int not null check (year between 1991 and 1999),
  generation public.car_generation not null,
  trim text,
  original_engine_variant public.engine_variant not null,
  target_engine_variant public.engine_variant not null,
  drivetrain text,
  vin text,
  color text,
  builder_id uuid,
  budget_cents bigint not null default 0 check (budget_cents >= 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (builder_id, household_id) references public.builders(id, household_id),
  constraint cars_generation_matches_year check (
    (generation = 'gen1_1991_93' and year between 1991 and 1993) or
    (generation = 'gen2_1994_96' and year between 1994 and 1996) or
    (generation = 'gen3_1997_99' and year between 1997 and 1999)
  )
);
create index cars_household_idx on public.cars(household_id);

create table public.part_slots (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  car_id uuid not null,
  system public.car_system not null,
  subsystem text,
  name text not null,
  required_qty int not null default 1 check (required_qty > 0),
  fitment_notes text,
  fits_years int4range, -- null means no known restriction
  destination public.slot_destination not null default 'car',
  build_status public.build_status not null default 'needed',
  needs_review boolean not null default false,
  sort_order int not null default 0,
  template_key text, -- which template created it; null for hand-added slots
  created_at timestamptz not null default now(),
  unique (id, household_id),
  unique (id, car_id),
  foreign key (car_id, household_id) references public.cars(id, household_id) on delete cascade
);
create index part_slots_car_idx on public.part_slots(car_id, system, sort_order);
create index part_slots_household_status_idx on public.part_slots(household_id, build_status);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind public.import_kind not null,
  filename text,
  row_count int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, household_id)
);

create table public.acquisitions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  car_id uuid, -- null = spare / not assigned to a car yet
  slot_id uuid,
  title text not null,
  qty int not null default 1 check (qty > 0),
  condition text,
  source public.acquisition_source not null default 'other',
  seller_name text,
  listing_url text,
  price_cents bigint not null default 0 check (price_cents >= 0),
  shipping_cents bigint not null default 0 check (shipping_cents >= 0),
  fits_years int4range,
  purchased_at date,
  location_status public.location_status not null default 'with_seller',
  notes text,
  import_batch_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  -- a car with purchases cannot be deleted on its own (reassign them first);
  -- "no action" is checked at end of statement so a household delete still cascades
  foreign key (car_id, household_id) references public.cars(id, household_id) on delete no action,
  -- a slot link must be a slot on the same car
  foreign key (slot_id, car_id) references public.part_slots(id, car_id) on delete set null (slot_id),
  -- rolling back an import deletes its rows
  foreign key (import_batch_id, household_id) references public.import_batches(id, household_id) on delete cascade,
  constraint acquisitions_slot_needs_car check (slot_id is null or car_id is not null)
);
create index acquisitions_household_idx on public.acquisitions(household_id, purchased_at desc);
create index acquisitions_slot_idx on public.acquisitions(slot_id);
create index acquisitions_car_idx on public.acquisitions(car_id);

create table public.acquisition_location_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  acquisition_id uuid not null,
  from_status public.location_status,
  to_status public.location_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  foreign key (acquisition_id, household_id) references public.acquisitions(id, household_id) on delete cascade
);
create index acquisition_location_events_acq_idx on public.acquisition_location_events(acquisition_id, changed_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  method public.payment_method not null,
  amount_cents bigint not null check (amount_cents > 0),
  paid_at date not null default current_date,
  counterparty text,
  memo text,
  external_id text, -- transaction id from Venmo/PayPal/bank exports, for dedupe
  raw jsonb,        -- original import row
  import_batch_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (import_batch_id, household_id) references public.import_batches(id, household_id) on delete cascade
);
create index payments_household_idx on public.payments(household_id, paid_at desc);
create unique index payments_external_id_idx on public.payments(household_id, method, external_id)
  where external_id is not null;

-- One payment can be split across several acquisitions (a seller's lot),
-- and one acquisition can be paid by several payments (deposit + balance).
-- A payment with no allocations is "unmatched".
create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  payment_id uuid not null,
  acquisition_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, acquisition_id),
  foreign key (payment_id, household_id) references public.payments(id, household_id) on delete cascade,
  foreign key (acquisition_id, household_id) references public.acquisitions(id, household_id) on delete cascade
);
create index payment_allocations_acq_idx on public.payment_allocations(acquisition_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  carrier text,
  tracking_number text,
  from_label text,
  to_label text,
  shipped_at date,
  delivered_at date,
  cost_cents bigint not null default 0 check (cost_cents >= 0),
  payment_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  unique (id, household_id),
  foreign key (payment_id, household_id) references public.payments(id, household_id) on delete set null (payment_id)
);

create table public.shipment_items (
  household_id uuid not null,
  shipment_id uuid not null,
  acquisition_id uuid not null,
  primary key (shipment_id, acquisition_id),
  foreign key (shipment_id, household_id) references public.shipments(id, household_id) on delete cascade,
  foreign key (acquisition_id, household_id) references public.acquisitions(id, household_id) on delete cascade
);
create index shipment_items_acq_idx on public.shipment_items(acquisition_id);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  entity_type public.attachment_entity not null,
  entity_id uuid not null,
  storage_path text not null, -- {household_id}/{entity_type}/{entity_id}/{file}
  caption text,
  created_at timestamptz not null default now()
);
create index attachments_entity_idx on public.attachments(entity_type, entity_id);
