-- Service manuals and the figures cut out of them. Figures link to slot
-- *types* (part_slots.template_key) so every car with that slot, including
-- cars added later, shows the diagram.

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  slug text not null,
  title text not null,
  applies_to text,
  source_note text,
  storage_path text not null, -- bucket "manuals"
  page_count int,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  unique (household_id, slug),
  unique (id, household_id)
);

create table public.document_figures (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  document_id uuid not null,
  key text not null,
  page int not null check (page > 0),
  section text,
  title text not null,
  kind text not null default 'illustration' check (kind in ('illustration', 'reference')),
  storage_path text not null, -- bucket "manuals"
  sort_order int not null default 0,
  unique (document_id, key),
  unique (id, household_id),
  foreign key (document_id, household_id) references public.documents(id, household_id) on delete cascade
);

create table public.figure_slot_links (
  household_id uuid not null,
  figure_id uuid not null,
  template_key text not null,
  primary key (figure_id, template_key),
  foreign key (figure_id, household_id) references public.document_figures(id, household_id) on delete cascade
);
create index figure_slot_links_template_idx on public.figure_slot_links(household_id, template_key);

alter table public.documents enable row level security;
alter table public.document_figures enable row level security;
alter table public.figure_slot_links enable row level security;

create policy documents_household on public.documents for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy document_figures_household on public.document_figures for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy figure_slot_links_household on public.figure_slot_links for all to authenticated
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- Private bucket; paths start with the household id like photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('manuals', 'manuals', false, 52428800, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy manuals_household_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'manuals'
    and exists (
      select 1 from public.household_members m
      where m.user_id = auth.uid() and m.household_id::text = (storage.foldername(name))[1]
    )
  );
