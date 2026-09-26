-- Deleting a household cascades through cars, payments and allocations in one
-- statement, but Postgres doesn't guarantee which cascade runs first, so a
-- NO ACTION check on cars could fire while rows pointing at the car were still
-- waiting to be cascaded away.

-- Car costs (labor etc.) belong to the car: deleting the car removes them and
-- the payment goes back to "to assign".
alter table public.payment_allocations
  drop constraint payment_allocations_car_fkey,
  add constraint payment_allocations_car_fkey
    foreign key (car_id, household_id) references public.cars(id, household_id) on delete cascade;

-- Purchases still block deleting their car, but the check now runs at commit,
-- after every cascade in the transaction has finished.
alter table public.acquisitions
  drop constraint acquisitions_car_id_household_id_fkey,
  add constraint acquisitions_car_id_household_id_fkey
    foreign key (car_id, household_id) references public.cars(id, household_id)
    on delete no action deferrable initially deferred;
