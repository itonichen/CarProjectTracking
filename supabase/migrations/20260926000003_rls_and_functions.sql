-- Row level security: every table is scoped to the caller's household.

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = hid and m.user_id = auth.uid()
  );
$$;

-- The household the caller belongs to. Two-user households only ever have one.
create or replace function public.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.household_members
  where user_id = auth.uid()
  order by created_at
  limit 1;
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.builders enable row level security;
alter table public.cars enable row level security;
alter table public.part_slots enable row level security;
alter table public.import_batches enable row level security;
alter table public.acquisitions enable row level security;
alter table public.acquisition_location_events enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.attachments enable row level security;

create policy households_select on public.households
  for select to authenticated using (public.is_household_member(id));
create policy households_update on public.households
  for update to authenticated using (public.is_household_member(id));

-- Membership rows are created only through create_household / accept_invite.
create policy household_members_select on public.household_members
  for select to authenticated using (public.is_household_member(household_id));

create policy household_invites_select on public.household_invites
  for select to authenticated using (public.is_household_member(household_id));
create policy household_invites_insert on public.household_invites
  for insert to authenticated with check (public.is_household_member(household_id));
create policy household_invites_delete on public.household_invites
  for delete to authenticated using (public.is_household_member(household_id));

do $$
declare
  t text;
begin
  foreach t in array array[
    'builders', 'cars', 'part_slots', 'import_batches', 'acquisitions',
    'acquisition_location_events', 'payments', 'payment_allocations',
    'shipments', 'shipment_items', 'attachments'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_household_member(household_id))
         with check (public.is_household_member(household_id))',
      t || '_household', t
    );
  end loop;
end
$$;

-- Household bootstrap ------------------------------------------------------

create or replace function public.create_household(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already in a household';
  end if;
  insert into public.households(name) values (p_name) returning id into hid;
  insert into public.household_members(household_id, user_id) values (hid, auth.uid());
  return hid;
end;
$$;

create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.household_invites;
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already in a household';
  end if;
  select * into inv from public.household_invites
  where code = p_code and used_at is null and expires_at > now()
  for update;
  if not found then
    raise exception 'invite is invalid or expired';
  end if;
  insert into public.household_members(household_id, user_id) values (inv.household_id, auth.uid());
  update public.household_invites set used_by = auth.uid(), used_at = now() where id = inv.id;
  return inv.household_id;
end;
$$;

revoke execute on function public.create_household(text) from anon;
revoke execute on function public.accept_invite(text) from anon;

-- Location history ---------------------------------------------------------

create or replace function public.log_location_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.location_status is distinct from old.location_status then
    insert into public.acquisition_location_events
      (household_id, acquisition_id, from_status, to_status, changed_by)
    values
      (new.household_id, new.id,
       case when tg_op = 'UPDATE' then old.location_status end,
       new.location_status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger acquisitions_location_log
  after insert or update of location_status on public.acquisitions
  for each row execute function public.log_location_change();

-- Allocations can't exceed the payment -------------------------------------

create or replace function public.assert_allocations_within_payment(pid uuid)
returns void
language plpgsql
as $$
declare
  total bigint;
  amount bigint;
begin
  select coalesce(sum(amount_cents), 0) into total from public.payment_allocations where payment_id = pid;
  select amount_cents into amount from public.payments where id = pid;
  if total > amount then
    raise exception 'allocations (% cents) exceed payment amount (% cents)', total, amount
      using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.check_allocation_total()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_allocations_within_payment(new.payment_id);
  return new;
end;
$$;

create or replace function public.check_payment_covers_allocations()
returns trigger
language plpgsql
as $$
begin
  perform public.assert_allocations_within_payment(new.id);
  return new;
end;
$$;

create constraint trigger payment_allocations_total
  after insert or update on public.payment_allocations
  deferrable initially deferred
  for each row execute function public.check_allocation_total();

create constraint trigger payments_amount_covers_allocations
  after update of amount_cents on public.payments
  deferrable initially deferred
  for each row execute function public.check_payment_covers_allocations();

-- Car creation with template slots in one transaction ----------------------
-- Templates live in TypeScript (src/lib/templates.ts); the app expands them
-- into rows and passes them here so a car never exists without its slots.

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
    fits_years, destination, needs_review, sort_order, template_key
  )
  select
    (p_car->>'household_id')::uuid, cid,
    (s->>'system')::public.car_system, s->>'subsystem', s->>'name',
    coalesce((s->>'required_qty')::int, 1), s->>'fitment_notes',
    case when s ? 'fits_from' then int4range((s->>'fits_from')::int, (s->>'fits_to')::int, '[]') end,
    (s->>'destination')::public.slot_destination,
    coalesce((s->>'needs_review')::boolean, false),
    coalesce((s->>'sort_order')::int, 0),
    s->>'template_key'
  from jsonb_array_elements(p_slots) as s;

  return cid;
end;
$$;

-- Photo storage ------------------------------------------------------------
-- Object paths start with the household id: {household_id}/{entity}/{id}/{file}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy photos_household_all on storage.objects
  for all to authenticated
  using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.household_members m
      where m.user_id = auth.uid()
        and m.household_id::text = (storage.foldername(name))[1]
    )
  )
  with check (
    bucket_id = 'photos'
    and exists (
      select 1 from public.household_members m
      where m.user_id = auth.uid()
        and m.household_id::text = (storage.foldername(name))[1]
    )
  );
