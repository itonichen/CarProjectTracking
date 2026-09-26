-- Quick add: one call records a purchase, optionally the payment for it, and
-- an uploaded photo, in a single transaction. Runs as the caller, so RLS and
-- the composite foreign keys still decide what is allowed.

create or replace function public.quick_add_acquisition(
  p_acq jsonb,
  p_payment_method public.payment_method default null,
  p_photo_path text default null
)
returns uuid
language plpgsql
as $$
declare
  hid uuid := (p_acq->>'household_id')::uuid;
  aid uuid := coalesce((p_acq->>'id')::uuid, gen_random_uuid());
  total bigint;
  pid uuid;
begin
  insert into public.acquisitions (
    id, household_id, car_id, slot_id, title, qty, source, seller_name, listing_url,
    price_cents, shipping_cents, fits_years, purchased_at, location_status, created_by
  )
  select
    aid, hid,
    nullif(p_acq->>'car_id', '')::uuid,
    nullif(p_acq->>'slot_id', '')::uuid,
    p_acq->>'title',
    coalesce((p_acq->>'qty')::int, 1),
    coalesce(p_acq->>'source', 'other')::public.acquisition_source,
    nullif(p_acq->>'seller_name', ''),
    nullif(p_acq->>'listing_url', ''),
    coalesce((p_acq->>'price_cents')::bigint, 0),
    coalesce((p_acq->>'shipping_cents')::bigint, 0),
    -- copy the slot's fitment range so the purchase keeps it
    (select fits_years from public.part_slots where id = nullif(p_acq->>'slot_id', '')::uuid),
    coalesce((p_acq->>'purchased_at')::date, current_date),
    coalesce(p_acq->>'location_status', 'with_seller')::public.location_status,
    auth.uid();

  total := coalesce((p_acq->>'price_cents')::bigint, 0) + coalesce((p_acq->>'shipping_cents')::bigint, 0);
  if p_payment_method is not null and total > 0 then
    insert into public.payments (household_id, method, amount_cents, paid_at, counterparty, created_by)
    values (hid, p_payment_method, total, coalesce((p_acq->>'purchased_at')::date, current_date),
            nullif(p_acq->>'seller_name', ''), auth.uid())
    returning id into pid;
    insert into public.payment_allocations (household_id, payment_id, acquisition_id, amount_cents)
    values (hid, pid, aid, total);
  end if;

  if p_photo_path is not null then
    if p_photo_path not like hid::text || '/acquisition/' || aid::text || '/%' then
      raise exception 'photo path does not belong to this purchase';
    end if;
    insert into public.attachments (household_id, entity_type, entity_id, storage_path)
    values (hid, 'acquisition', aid, p_photo_path);
  end if;

  return aid;
end;
$$;

revoke execute on function public.quick_add_acquisition(jsonb, public.payment_method, text) from anon;
