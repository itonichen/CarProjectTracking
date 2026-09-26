-- Link an existing payment (e.g. an imported PayPal payment) to a part: record
-- a purchase on that part for the amount and assign the payment to it, in one
-- transaction. Runs as the caller, so RLS applies.

create or replace function public.link_payment_to_slot(p_slot uuid, p_payment uuid, p_amount bigint)
returns uuid
language plpgsql
as $$
declare
  s public.part_slots;
  p public.payments;
  aid uuid;
begin
  select * into s from public.part_slots where id = p_slot;
  if not found then raise exception 'part not found'; end if;
  select * into p from public.payments where id = p_payment and household_id = s.household_id;
  if not found then raise exception 'payment not found'; end if;

  insert into public.acquisitions (
    household_id, car_id, slot_id, title, source, seller_name, price_cents,
    fits_years, purchased_at, location_status, notes, created_by
  ) values (
    s.household_id, s.car_id, s.id, s.name, 'other', p.counterparty, p_amount,
    s.fits_years, p.paid_at, 'at_home', p.memo, auth.uid()
  ) returning id into aid;

  insert into public.payment_allocations (household_id, payment_id, acquisition_id, amount_cents)
  values (s.household_id, p.id, aid, p_amount);

  return aid;
end;
$$;

revoke execute on function public.link_payment_to_slot(uuid, uuid, bigint) from anon;
