-- Commit a CSV import as one batch in one transaction. Row ids are generated
-- by the client so allocations can reference payments and purchases created
-- in the same call. Runs as the caller, so RLS applies. Deleting the batch
-- rolls the import back (payments and purchases cascade; their allocations
-- cascade with them).

create or replace function public.import_commit(
  p_batch jsonb,
  p_payments jsonb default '[]',
  p_acquisitions jsonb default '[]',
  p_allocations jsonb default '[]'
)
returns uuid
language plpgsql
as $$
declare
  hid uuid := (p_batch->>'household_id')::uuid;
  bid uuid := (p_batch->>'id')::uuid;
begin
  insert into public.import_batches (id, household_id, kind, filename, row_count, created_by)
  values (bid, hid, (p_batch->>'kind')::public.import_kind, p_batch->>'filename',
          jsonb_array_length(p_payments) + jsonb_array_length(p_acquisitions), auth.uid());

  insert into public.payments (id, household_id, method, amount_cents, paid_at, counterparty, memo, external_id, raw, import_batch_id, created_by)
  select p.id, hid, p.method, p.amount_cents, p.paid_at, p.counterparty, p.memo, p.external_id, p.raw, bid, auth.uid()
  from jsonb_to_recordset(p_payments) as p(
    id uuid, method public.payment_method, amount_cents bigint, paid_at date,
    counterparty text, memo text, external_id text, raw jsonb
  );

  insert into public.acquisitions (
    id, household_id, car_id, title, qty, condition, source, seller_name, listing_url,
    price_cents, shipping_cents, purchased_at, location_status, notes, import_batch_id, created_by
  )
  select a.id, hid, a.car_id, a.title, coalesce(a.qty, 1), a.condition, coalesce(a.source, 'other'), a.seller_name, a.listing_url,
         coalesce(a.price_cents, 0), coalesce(a.shipping_cents, 0), a.purchased_at,
         coalesce(a.location_status, 'at_home'), a.notes, bid, auth.uid()
  from jsonb_to_recordset(p_acquisitions) as a(
    id uuid, car_id uuid, title text, qty int, condition text, source public.acquisition_source,
    seller_name text, listing_url text, price_cents bigint, shipping_cents bigint, purchased_at date,
    location_status public.location_status, notes text
  );

  insert into public.payment_allocations (household_id, payment_id, acquisition_id, car_id, cost_type, amount_cents)
  select hid, l.payment_id, l.acquisition_id, l.car_id, l.cost_type, l.amount_cents
  from jsonb_to_recordset(p_allocations) as l(
    payment_id uuid, acquisition_id uuid, car_id uuid, cost_type public.cost_type, amount_cents bigint
  );

  return bid;
end;
$$;

revoke execute on function public.import_commit(jsonb, jsonb, jsonb, jsonb) from anon;
