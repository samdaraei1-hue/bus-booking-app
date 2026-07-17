alter table if exists public.travels
  add column if not exists addons jsonb not null default '[]'::jsonb;

alter table if exists public.reservation_groups
  add column if not exists base_amount numeric(12, 2) not null default 0,
  add column if not exists addons_amount numeric(12, 2) not null default 0,
  add column if not exists total_amount numeric(12, 2) not null default 0,
  add column if not exists addon_selections jsonb not null default '[]'::jsonb;
