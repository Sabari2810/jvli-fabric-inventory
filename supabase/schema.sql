-- JVLI fabric inventory schema
-- Run this once in the Supabase dashboard: SQL Editor > New query > paste > Run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create sequence if not exists fabric_lot_seq start 1;

-- One row per fabric purchase (a "lot").
create table if not exists public.fabric_lots (
  id                uuid primary key default gen_random_uuid(),
  lot_code          text not null unique
                      default ('LOT-' || lpad(nextval('fabric_lot_seq')::text, 4, '0')),
  purchase_date     date not null default current_date,
  supplier          text,
  fabric_name       text not null,
  color             text,
  meters_bought     numeric(10,2) not null check (meters_bought > 0),
  rate_per_meter    numeric(10,2) not null default 0 check (rate_per_meter >= 0),
  purpose           text not null check (purpose in ('sample', 'production')),
  low_stock_meters  numeric(10,2) not null default 5 check (low_stock_meters >= 0),
  notes             text,
  image_data        text check (image_data is null or (image_data like 'data:image/webp;base64,%' and length(image_data) <= 1500000)),
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now()
);

-- One row every time fabric from a lot is cut.
create table if not exists public.fabric_usage (
  id              uuid primary key default gen_random_uuid(),
  lot_id          uuid not null references public.fabric_lots (id) on delete restrict,
  usage_date      date not null default current_date,
  design_code     text,
  usage_type      text not null check (usage_type in ('sample', 'actual')),
  meters_used     numeric(10,2) not null check (meters_used >= 0),
  wastage_meters  numeric(10,2) not null default 0 check (wastage_meters >= 0),
  notes           text,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now()
);

create index if not exists fabric_usage_lot_id_idx on public.fabric_usage (lot_id);
create index if not exists fabric_usage_date_idx on public.fabric_usage (usage_date desc);

-- ---------------------------------------------------------------------------
-- Guards: never let usage exceed what was bought
-- ---------------------------------------------------------------------------

create or replace function public.check_fabric_usage()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  bought numeric;
  already numeric;
begin
  -- Lock the lot row so two people logging usage at once cannot overdraw it.
  select meters_bought into bought
    from public.fabric_lots
   where id = new.lot_id
   for update;

  select coalesce(sum(meters_used + wastage_meters), 0) into already
    from public.fabric_usage
   where lot_id = new.lot_id
     and id is distinct from new.id;

  if already + new.meters_used + new.wastage_meters > bought then
    raise exception 'Not enough fabric in this lot. Available: % m', (bought - already);
  end if;

  return new;
end;
$$;

drop trigger if exists fabric_usage_check on public.fabric_usage;
create trigger fabric_usage_check
  before insert or update on public.fabric_usage
  for each row execute function public.check_fabric_usage();

create or replace function public.check_fabric_lot_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  consumed numeric;
begin
  select coalesce(sum(meters_used + wastage_meters), 0) into consumed
    from public.fabric_usage
   where lot_id = new.id;

  if new.meters_bought < consumed then
    raise exception 'Cannot set meters bought below the % m already used or wasted from this lot', consumed;
  end if;

  return new;
end;
$$;

drop trigger if exists fabric_lot_update_check on public.fabric_lots;
create trigger fabric_lot_update_check
  before update on public.fabric_lots
  for each row execute function public.check_fabric_lot_update();

-- ---------------------------------------------------------------------------
-- Stock view: bought, used (sample vs actual), wastage and meters left per lot
-- security_invoker makes the view obey the row level security of the caller.
-- ---------------------------------------------------------------------------

create or replace view public.fabric_stock
with (security_invoker = true) as
select
  l.id,
  l.lot_code,
  l.purchase_date,
  l.supplier,
  l.fabric_name,
  l.color,
  l.purpose,
  l.meters_bought,
  l.rate_per_meter,
  l.low_stock_meters,
  l.notes,
  l.created_at,
  (l.meters_bought * l.rate_per_meter)                                          as total_cost,
  coalesce(sum(u.meters_used) filter (where u.usage_type = 'sample'), 0)        as meters_sample,
  coalesce(sum(u.meters_used) filter (where u.usage_type = 'actual'), 0)        as meters_actual,
  coalesce(sum(u.wastage_meters), 0)                                            as meters_wastage,
  l.meters_bought - coalesce(sum(u.meters_used + u.wastage_meters), 0)          as meters_left
from public.fabric_lots l
left join public.fabric_usage u on u.lot_id = l.id
group by l.id;

-- ---------------------------------------------------------------------------
-- Row level security: only signed-in users can touch the data
-- ---------------------------------------------------------------------------

alter table public.fabric_lots  enable row level security;
alter table public.fabric_usage enable row level security;

drop policy if exists "lots: authenticated full access" on public.fabric_lots;
create policy "lots: authenticated full access"
  on public.fabric_lots for all
  to authenticated
  using (true) with check (true);

drop policy if exists "usage: authenticated full access" on public.fabric_usage;
create policy "usage: authenticated full access"
  on public.fabric_usage for all
  to authenticated
  using (true) with check (true);

revoke all on public.fabric_lots, public.fabric_usage, public.fabric_stock from anon;
grant select, insert, update, delete on public.fabric_lots, public.fabric_usage to authenticated;
grant select on public.fabric_stock to authenticated;
