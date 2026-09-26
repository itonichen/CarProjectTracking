-- Household-defined part statuses ("Need to Buy", "Bought", ... plus custom
-- ones). Each maps to a build_status category so counts, the buy list and the
-- map keep working; part_slots.build_status is kept in sync by trigger. Also
-- free-form notes per part.

create table public.part_statuses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 40),
  category public.build_status not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, label),
  unique (id, household_id)
);

alter table public.part_statuses enable row level security;
create policy part_statuses_household on public.part_statuses for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create or replace function public.seed_part_statuses(hid uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.part_statuses (household_id, label, category, sort_order) values
    (hid, 'Need to Buy', 'needed', 10),
    (hid, 'Bought', 'have', 20),
    (hid, 'Shipped to Builder', 'have', 30),
    (hid, 'Built / In Car', 'installed', 40)
  on conflict (household_id, label) do nothing;
$$;

create or replace function public.households_seed_statuses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.seed_part_statuses(new.id);
  return new;
end;
$$;

create trigger households_default_statuses
  after insert on public.households
  for each row execute function public.households_seed_statuses();

select public.seed_part_statuses(id) from public.households;

alter table public.part_slots
  add column status_id uuid,
  add column notes text,
  add constraint part_slots_status_fkey
    foreign key (status_id, household_id) references public.part_statuses(id, household_id);

-- Keep status_id and build_status in step, whichever one was changed.
create or replace function public.sync_slot_status()
returns trigger
language plpgsql
as $$
begin
  if new.status_id is not null and (tg_op = 'INSERT' or new.status_id is distinct from old.status_id) then
    select category into new.build_status from public.part_statuses where id = new.status_id;
  elsif tg_op = 'INSERT' or new.build_status is distinct from old.build_status then
    new.status_id := (
      select id from public.part_statuses
      where household_id = new.household_id and category = new.build_status
      order by sort_order limit 1
    );
  end if;
  return new;
end;
$$;

create trigger part_slots_status_sync
  before insert or update of status_id, build_status on public.part_slots
  for each row execute function public.sync_slot_status();

update public.part_slots s set status_id = (
  select id from public.part_statuses p
  where p.household_id = s.household_id and p.category = s.build_status
  order by sort_order limit 1
);
