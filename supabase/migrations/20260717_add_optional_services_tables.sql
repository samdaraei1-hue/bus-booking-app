alter table if exists public.travels
  add column if not exists addons jsonb not null default '[]'::jsonb;

alter table if exists public.reservation_groups
  add column if not exists base_amount numeric(12, 2) not null default 0,
  add column if not exists addons_amount numeric(12, 2) not null default 0,
  add column if not exists total_amount numeric(12, 2) not null default 0,
  add column if not exists addon_selections jsonb not null default '[]'::jsonb;

create table if not exists public.travel_addons (
  id uuid not null default gen_random_uuid(),
  travel_id uuid not null,
  name text not null,
  description text,
  price numeric(12, 2) not null default 0,
  pricing_mode text not null default 'per_booking'::text check (
    pricing_mode = any (array['per_booking'::text, 'per_participant'::text])
  ),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint travel_addons_pkey primary key (id),
  constraint travel_addons_travel_id_fkey foreign key (travel_id) references public.travels(id) on delete cascade
);

create index if not exists travel_addons_travel_id_sort_order_idx
  on public.travel_addons (travel_id, sort_order);

create table if not exists public.reservation_addons (
  id uuid not null default gen_random_uuid(),
  reservation_group_id uuid not null,
  travel_addon_id uuid,
  addon_id text not null,
  name text not null,
  description text,
  unit_price numeric(12, 2) not null default 0,
  pricing_mode text not null default 'per_booking'::text check (
    pricing_mode = any (array['per_booking'::text, 'per_participant'::text])
  ),
  quantity integer not null default 1,
  total_price numeric(12, 2) not null default 0,
  created_at timestamp with time zone not null default now(),
  constraint reservation_addons_pkey primary key (id),
  constraint reservation_addons_group_id_fkey foreign key (reservation_group_id) references public.reservation_groups(id) on delete cascade,
  constraint reservation_addons_travel_addon_id_fkey foreign key (travel_addon_id) references public.travel_addons(id) on delete set null
);

create index if not exists reservation_addons_group_id_idx
  on public.reservation_addons (reservation_group_id);

alter table public.travel_addons enable row level security;
alter table public.reservation_addons enable row level security;

drop policy if exists "travel_addons_select" on public.travel_addons;
drop policy if exists "travel_addons_manage" on public.travel_addons;
drop policy if exists "reservation_addons_select" on public.reservation_addons;
drop policy if exists "reservation_addons_manage" on public.reservation_addons;

create policy "travel_addons_select"
  on public.travel_addons
  for select
  using (
    is_active
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
  );

create policy "travel_addons_manage"
  on public.travel_addons
  for all
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
  );

create policy "reservation_addons_select"
  on public.reservation_addons
  for select
  using (
    exists (
      select 1
      from public.reservation_groups rg
      where rg.id = reservation_group_id
        and rg.booker_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
  );

create policy "reservation_addons_manage"
  on public.reservation_addons
  for all
  using (
    exists (
      select 1
      from public.reservation_groups rg
      where rg.id = reservation_group_id
        and rg.booker_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
  )
  with check (
    exists (
      select 1
      from public.reservation_groups rg
      where rg.id = reservation_group_id
        and rg.booker_user_id = auth.uid()
    )
    or exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = any (array['admin'::text, 'leader'::text, 'owner'::text, 'driver'::text])
    )
  );
