-- Payments can pay for things that aren't part purchases: builder labor, the
-- car itself, etc. An allocation now targets either an acquisition or a car
-- with a cost type, never both.

create type public.cost_type as enum ('labor', 'car_purchase', 'other');

alter table public.payment_allocations
  alter column acquisition_id drop not null,
  add column car_id uuid,
  add column cost_type public.cost_type,
  add constraint payment_allocations_car_fkey
    foreign key (car_id, household_id) references public.cars(id, household_id),
  add constraint payment_allocations_one_target check (
    (acquisition_id is not null and car_id is null and cost_type is null) or
    (acquisition_id is null and car_id is not null and cost_type is not null)
  );

create unique index payment_allocations_car_cost_idx
  on public.payment_allocations(payment_id, car_id, cost_type)
  where car_id is not null;
create index payment_allocations_car_idx on public.payment_allocations(car_id) where car_id is not null;

-- Direct costs per car (labor, car purchase, other).
create view public.car_direct_costs with (security_invoker = true) as
select household_id, car_id, cost_type, sum(amount_cents)::bigint as amount_cents
from public.payment_allocations
where car_id is not null
group by household_id, car_id, cost_type;

-- Spent now = parts (acquisition price + shipping) + direct costs.
create or replace view public.car_summary with (security_invoker = true) as
select
  c.*,
  coalesce(m.parts_cents, 0) + coalesce(d.direct_cents, 0) as spent_cents,
  coalesce(sl.open_slots, 0) as open_slots,
  coalesce(sl.total_slots, 0) as total_slots,
  coalesce(b.at_builder_count, 0) as at_builder_count,
  coalesce(m.parts_cents, 0) as parts_cents,
  coalesce(d.labor_cents, 0) as labor_cents,
  coalesce(d.direct_cents, 0) - coalesce(d.labor_cents, 0) as other_direct_cents
from public.cars c
left join (
  select car_id, sum(price_cents + shipping_cents)::bigint as parts_cents
  from public.acquisitions
  where car_id is not null and location_status not in ('returned')
  group by car_id
) m on m.car_id = c.id
left join (
  select car_id,
    sum(amount_cents)::bigint as direct_cents,
    (sum(amount_cents) filter (where cost_type = 'labor'))::bigint as labor_cents
  from public.payment_allocations
  where car_id is not null
  group by car_id
) d on d.car_id = c.id
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
