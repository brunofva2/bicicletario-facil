-- Stores the current application state per condominium during the pilot.
-- PII remains protected by RLS; this table is never exposed to anonymous QR scans.

create table if not exists public.condominium_snapshots (
  condominium_id uuid primary key references public.condominiums(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.condominium_snapshots enable row level security;

create policy "members read their condominium snapshot" on public.condominium_snapshots
for select to authenticated using (public.can_access_condominium(condominium_id));

create policy "managers write their condominium snapshot" on public.condominium_snapshots
for all to authenticated using (public.can_manage_condominium(condominium_id))
with check (public.can_manage_condominium(condominium_id));
