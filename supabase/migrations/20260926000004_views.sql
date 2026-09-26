-- Read models. security_invoker makes each view run under the caller's RLS.

-- Acquisition cost and how much of it payments cover.
create view public.acquisition_money with (security_invoker = true) as
select
  a.id as acquisition_id,
  a.household_id,
  a.car_id,
  a.slot_id,
  a.price_cents + a.shipping_cents as cost_cents,
  coalesce(pa.allocated_cents, 0) as allocated_cents,
  case
    when coalesce(pa.allocated_cents, 0) = 0 then 'unpaid'
    when pa.allocated_cents < a.price_cents + a.shipping_cents then 'partial'
    else 'paid'
  end as payment_state
from public.acquisitions a
left join (
  select acquisition_id, sum(amount_cents)::bigint as allocated_cents
  from public.payment_allocations
  group by acquisition_id
) pa on pa.acquisition_id = a.id;

-- Payments and how much of each is matched to acquisitions.
create view public.payment_matching with (security_invoker = true) as
select
  p.*,
  coalesce(pa.allocated_cents, 0) as allocated_cents,
  p.amount_cents - coalesce(pa.allocated_cents, 0) as unallocated_cents
from public.payments p
left join (
  select payment_id, sum(amount_cents)::bigint as allocated_cents
  from public.payment_allocations
  group by payment_id
) pa on pa.payment_id = p.id;

-- Per slot: quantity on hand (anything not returned/sold) vs required.
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

-- Diagram zones: slots done (have or installed) out of total, per car and system.
create view public.car_system_progress with (security_invoker = true) as
select
  s.household_id,
  s.car_id,
  s.system,
  count(*)::int as total_slots,
  count(*) filter (where s.build_status in ('have', 'installed'))::int as done_slots,
  count(*) filter (where s.build_status in ('needed', 'sourcing'))::int as open_slots,
  count(*) filter (where s.needs_review)::int as review_slots
from public.part_slots s
group by s.household_id, s.car_id, s.system;

-- Garage cards: spend vs budget and headline counts per car.
create view public.car_summary with (security_invoker = true) as
select
  c.*,
  coalesce(m.spent_cents, 0) as spent_cents,
  coalesce(sl.open_slots, 0) as open_slots,
  coalesce(sl.total_slots, 0) as total_slots,
  coalesce(b.at_builder_count, 0) as at_builder_count
from public.cars c
left join (
  select car_id, sum(price_cents + shipping_cents)::bigint as spent_cents
  from public.acquisitions
  where car_id is not null and location_status not in ('returned')
  group by car_id
) m on m.car_id = c.id
left join (
  select car_id,
    count(*) filter (where build_status in ('needed', 'sourcing'))::int as open_slots,
    count(*)::int as total_slots
  from public.part_slots
  group by car_id
) sl on sl.car_id = c.id
left join (
  select car_id, count(*)::int as at_builder_count
  from public.acquisitions
  where car_id is not null and location_status = 'at_builder'
  group by car_id
) b on b.car_id = c.id;

-- Buy list: open slots across all cars. Grouped in the UI by system, then name.
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
  s.needs_review
from public.part_slots s
join public.cars c on c.id = s.car_id
left join public.slot_progress sp on sp.id = s.id
where s.build_status in ('needed', 'sourcing');

-- Parts that belong at the builder but are sitting at home.
create view public.needs_to_ship_to_builder with (security_invoker = true) as
select
  a.id as acquisition_id,
  a.household_id,
  a.car_id,
  c.nickname as car_nickname,
  a.slot_id,
  s.system,
  s.name as slot_name,
  a.title,
  a.qty,
  a.purchased_at
from public.acquisitions a
join public.part_slots s on s.id = a.slot_id
join public.cars c on c.id = a.car_id
where s.destination = 'builder' and a.location_status = 'at_home';
