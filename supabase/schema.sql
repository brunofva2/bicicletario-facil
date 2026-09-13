-- Bicicletário Fácil / Nobrutec
-- Execute this file in Supabase > SQL Editor before connecting the application.
-- It creates isolated condominium data and a deliberately limited public QR endpoint.

create extension if not exists "pgcrypto";

create type public.app_role as enum ('nobrutec_admin', 'syndic', 'staff');
create type public.allocation_status as enum ('active', 'released');

create table public.condominiums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  city text,
  support_email text not null default 'brunobicicletario@gmail.com',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  condominium_id uuid references public.condominiums(id) on delete cascade,
  full_name text not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  constraint staff_requires_condominium check (
    (role = 'nobrutec_admin' and condominium_id is null) or
    (role <> 'nobrutec_admin' and condominium_id is not null)
  )
);

create table public.bicycle_spots (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  spot_number text not null,
  sector text not null,
  hook_type text not null,
  max_weight_kg integer not null check (max_weight_kg > 0),
  public_slug uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  unique (condominium_id, spot_number)
);

create table public.bicycles (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  resident_name text not null,
  apartment text not null,
  block text not null,
  resident_phone text,
  resident_email text,
  brand_model text not null,
  color text not null,
  tag_number text,
  photo_url text,
  created_at timestamptz not null default now()
);

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  spot_id uuid not null references public.bicycle_spots(id) on delete cascade,
  bicycle_id uuid not null references public.bicycles(id) on delete restrict,
  status public.allocation_status not null default 'active',
  allocated_at timestamptz not null default now(),
  released_at timestamptz
);

create unique index allocations_one_active_spot
  on public.allocations (spot_id) where status = 'active';

create table public.audit_logs (
  id bigint generated always as identity primary key,
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.is_nobrutec_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'nobrutec_admin');
$$;

create or replace function public.can_access_condominium(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_nobrutec_admin() or exists (
    select 1 from public.profiles where id = auth.uid() and condominium_id = target_id
  );
$$;

alter table public.condominiums enable row level security;
alter table public.profiles enable row level security;
alter table public.bicycle_spots enable row level security;
alter table public.bicycles enable row level security;
alter table public.allocations enable row level security;
alter table public.audit_logs enable row level security;

create policy "condominium members read their condominium" on public.condominiums
for select to authenticated using (public.can_access_condominium(id));
create policy "nobrutec manages condominiums" on public.condominiums
for all to authenticated using (public.is_nobrutec_admin()) with check (public.is_nobrutec_admin());

create policy "users read their own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.is_nobrutec_admin());
create policy "nobrutec manages profiles" on public.profiles for all to authenticated using (public.is_nobrutec_admin()) with check (public.is_nobrutec_admin());

create policy "members access spots in their condominium" on public.bicycle_spots for all to authenticated
using (public.can_access_condominium(condominium_id)) with check (public.can_access_condominium(condominium_id));
create policy "members access bicycles in their condominium" on public.bicycles for all to authenticated
using (public.can_access_condominium(condominium_id)) with check (public.can_access_condominium(condominium_id));
create policy "members access allocations in their condominium" on public.allocations for all to authenticated
using (public.can_access_condominium(condominium_id)) with check (public.can_access_condominium(condominium_id));
create policy "members access audit logs in their condominium" on public.audit_logs for all to authenticated
using (public.can_access_condominium(condominium_id)) with check (public.can_access_condominium(condominium_id));

-- Public QR endpoint. It returns no resident, apartment, phone, email or chassis data.
create or replace function public.get_public_spot(p_slug uuid)
returns table (
  condominium_name text,
  spot_number text,
  sector text,
  hook_type text,
  status text,
  bike_photo_url text,
  bike_model text,
  bike_color text,
  bike_tag text
)
language sql stable security definer set search_path = public as $$
  select c.name, s.spot_number, s.sector, s.hook_type,
    case when a.id is null then 'livre' else 'ocupada' end,
    b.photo_url, b.brand_model, b.color, b.tag_number
  from public.bicycle_spots s
  join public.condominiums c on c.id = s.condominium_id
  left join public.allocations a on a.spot_id = s.id and a.status = 'active'
  left join public.bicycles b on b.id = a.bicycle_id
  where s.public_slug = p_slug;
$$;
grant execute on function public.get_public_spot(uuid) to anon, authenticated;
