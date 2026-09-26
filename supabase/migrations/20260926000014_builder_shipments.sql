-- Shipments to the builder can carry parts directly (the household tracks
-- most parts by status, not purchases), and one status is marked as "at the
-- builder" so the app knows which bought parts still need to ship.

-- 1. Statuses: which one(s) mean the part is with the builder.
alter table public.part_statuses add column at_builder boolean not null default false;
update public.part_statuses set at_builder = true where label = 'Shipped to Builder';

create or replace function public.seed_part_statuses(hid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.part_statuses (household_id, label, category, sort_order, at_builder) values
    (hid, 'Need to Buy', 'needed', 10, false),
    (hid, 'Bought', 'have', 20, false),
    (hid, 'Shipped to Builder', 'have', 30, true),
    (hid, 'Built / In Car', 'installed', 40, false)
  on conflict (household_id, label) do nothing;
$$;

-- 2. Shipment items reference a purchase, a part, or both.
alter table public.shipment_items drop constraint shipment_items_pkey;
alter table public.shipment_items
  add column id uuid primary key default gen_random_uuid(),
  alter column acquisition_id drop not null,
  add column slot_id uuid,
  add constraint shipment_items_slot_fkey
    foreign key (slot_id, household_id) references public.part_slots(id, household_id) on delete cascade,
  add constraint shipment_items_has_target check (acquisition_id is not null or slot_id is not null);
create unique index shipment_items_acq_uidx on public.shipment_items(shipment_id, acquisition_id) where acquisition_id is not null;
create unique index shipment_items_slot_uidx on public.shipment_items(shipment_id, slot_id) where slot_id is not null;
create index shipment_items_slot_idx on public.shipment_items(slot_id);

-- 3. Ship parts to the builder in one step: record the shipment, list the
-- parts, move them to the household's at-builder status, and mark any of
-- their purchases that are at home as on the way to the builder.
create or replace function public.create_builder_shipment(p_shipment jsonb, p_slot_ids uuid[])
returns uuid
language plpgsql
as $$
declare
  hid uuid := (p_shipment->>'household_id')::uuid;
  sid uuid;
  status uuid;
begin
  if coalesce(array_length(p_slot_ids, 1), 0) = 0 then
    raise exception 'pick at least one part';
  end if;

  insert into public.shipments (household_id, carrier, tracking_number, from_label, to_label, shipped_at, cost_cents, notes)
  values (
    hid,
    nullif(p_shipment->>'carrier', ''),
    nullif(p_shipment->>'tracking_number', ''),
    coalesce(nullif(p_shipment->>'from_label', ''), 'Home'),
    coalesce(nullif(p_shipment->>'to_label', ''), 'Engine builder'),
    coalesce((p_shipment->>'shipped_at')::date, current_date),
    coalesce((p_shipment->>'cost_cents')::bigint, 0),
    nullif(p_shipment->>'notes', '')
  )
  returning id into sid;

  insert into public.shipment_items (household_id, shipment_id, slot_id)
  select hid, sid, s.id from public.part_slots s where s.id = any(p_slot_ids) and s.household_id = hid;

  select id into status from public.part_statuses where household_id = hid and at_builder order by sort_order limit 1;
  if status is not null then
    update public.part_slots set status_id = status where id = any(p_slot_ids) and household_id = hid;
  end if;

  update public.acquisitions set location_status = 'in_transit_to_builder'
  where slot_id = any(p_slot_ids) and household_id = hid and location_status in ('at_home', 'with_seller', 'in_transit_to_us');

  return sid;
end;
$$;

-- 4. Delivered: stamp the date and move the shipment's purchases to at_builder.
create or replace function public.mark_shipment_delivered(p_shipment uuid, p_date date default current_date)
returns void
language plpgsql
as $$
begin
  update public.shipments set delivered_at = coalesce(p_date, current_date) where id = p_shipment;
  if not found then raise exception 'shipment not found'; end if;

  update public.acquisitions a set location_status = 'at_builder'
  where a.location_status = 'in_transit_to_builder'
    and (
      a.id in (select acquisition_id from public.shipment_items where shipment_id = p_shipment)
      or a.slot_id in (select slot_id from public.shipment_items where shipment_id = p_shipment)
    );
end;
$$;

revoke execute on function public.create_builder_shipment(jsonb, uuid[]) from anon;
revoke execute on function public.mark_shipment_delivered(uuid, date) from anon;
