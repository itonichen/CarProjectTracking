-- Where a part lives on the car, for the parts map: a location zone on the
-- side view and, for engine-bay parts, a component in the top-down bay view.
-- Ids are defined in src/lib/partsmap/zones.ts. Copied from the template when
-- a car is created and editable per slot.

alter table public.part_slots
  add column zone text,
  add column bay text;

-- slot_progress expands s.*; recreate it (and buy_list, which reads it) so the
-- new columns come through.
drop view public.buy_list;
drop view public.slot_progress;

create view public.slot_progress with (security_invoker = true) as
select
  s.*,
  coalesce(q.have_qty, 0) as have_qty,
  coalesce(q.acquisition_count, 0) as acquisition_count
from public.part_slots s
left join (
  select slot_id, sum(qty)::int as have_qty, count(*)::int as acquisition_count
  from public.acquisitions
  where slot_id is not null and location_status not in ('returned', 'sold')
  group by slot_id
) q on q.slot_id = s.id;

create view public.buy_list with (security_invoker = true) as
select
  s.id as slot_id,
  s.household_id,
  s.car_id,
  c.nickname as car_nickname,
  c.year as car_year,
  c.generation,
  c.original_engine_variant,
  c.target_engine_variant,
  s.system,
  s.subsystem,
  s.name,
  s.required_qty,
  coalesce(sp.have_qty, 0) as have_qty,
  s.fitment_notes,
  s.fits_years,
  s.destination,
  s.build_status,
  s.needs_review,
  s.zone
from public.part_slots s
join public.cars c on c.id = s.car_id
left join public.slot_progress sp on sp.id = s.id
where s.build_status in ('needed', 'sourcing');

create or replace function public.create_car_with_slots(p_car jsonb, p_slots jsonb)
returns uuid
language plpgsql
as $$
declare
  cid uuid;
begin
  insert into public.cars (
    household_id, nickname, year, generation, trim,
    original_engine_variant, target_engine_variant, drivetrain, vin, color,
    builder_id, budget_cents, notes
  )
  select
    (p_car->>'household_id')::uuid, p_car->>'nickname', (p_car->>'year')::int,
    (p_car->>'generation')::public.car_generation, p_car->>'trim',
    (p_car->>'original_engine_variant')::public.engine_variant,
    (p_car->>'target_engine_variant')::public.engine_variant,
    p_car->>'drivetrain', p_car->>'vin', p_car->>'color',
    nullif(p_car->>'builder_id', '')::uuid,
    coalesce((p_car->>'budget_cents')::bigint, 0), p_car->>'notes'
  returning id into cid;

  insert into public.part_slots (
    household_id, car_id, system, subsystem, name, required_qty, fitment_notes,
    fits_years, destination, needs_review, sort_order, template_key, zone, bay
  )
  select
    (p_car->>'household_id')::uuid, cid,
    (s->>'system')::public.car_system, s->>'subsystem', s->>'name',
    coalesce((s->>'required_qty')::int, 1), s->>'fitment_notes',
    case when s ? 'fits_from' then int4range((s->>'fits_from')::int, (s->>'fits_to')::int, '[]') end,
    (s->>'destination')::public.slot_destination,
    coalesce((s->>'needs_review')::boolean, false),
    coalesce((s->>'sort_order')::int, 0),
    s->>'template_key', s->>'zone', s->>'bay'
  from jsonb_array_elements(p_slots) as s;

  return cid;
end;
$$;
