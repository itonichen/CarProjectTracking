-- slot_progress expands s.* when it is created, so it has to be recreated to
-- pick up part_slots.status_id and part_slots.notes. buy_list depends on it.
-- Any future column added to part_slots needs the same treatment.

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
  s.zone,
  s.status_id
from public.part_slots s
join public.cars c on c.id = s.car_id
left join public.slot_progress sp on sp.id = s.id
where s.build_status in ('needed', 'sourcing');
