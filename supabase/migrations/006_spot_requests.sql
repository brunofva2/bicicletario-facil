-- Fila de solicitações de vaga: portaria registra a solicitação e a gestão decide.
create table if not exists public.spot_requests (
  id uuid primary key default gen_random_uuid(),
  condominium_id uuid not null references public.condominiums(id) on delete cascade,
  resident_name text not null,
  apartment text not null,
  block text not null,
  resident_phone text,
  bicycle_description text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'waiting_list')),
  assigned_spot_id uuid references public.bicycle_spots(id) on delete set null,
  decision_note text,
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists spot_requests_condominium_status_idx on public.spot_requests(condominium_id, status, created_at);

alter table public.spot_requests enable row level security;

create policy "members read spot requests in their condominium" on public.spot_requests
for select to authenticated using (public.can_access_condominium(condominium_id));

create policy "members create spot requests in their condominium" on public.spot_requests
for insert to authenticated with check (public.can_access_condominium(condominium_id));

create policy "managers manage spot requests in their condominium" on public.spot_requests
for all to authenticated using (public.can_manage_condominium(condominium_id)) with check (public.can_manage_condominium(condominium_id));
