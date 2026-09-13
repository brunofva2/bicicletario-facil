-- Operações transacionais para a fase de produção.
-- Execute após as migrações 001 a 008 no SQL Editor do Supabase.
-- Mantém condominium_snapshots como compatibilidade/cache do piloto, mas estabelece
-- bicycle_spots, bicycles e allocations como fonte transacional para vínculos.

alter table public.bicycle_spots
  add column if not exists updated_at timestamptz not null default now();

alter table public.bicycles
  add column if not exists updated_at timestamptz not null default now();

-- Campos do catálogo usados pela operação, reavaliação e busca.
alter table public.bicycles
  add column if not exists category text,
  add column if not exists serial_number text,
  add column if not exists distinguishing_features text,
  add column if not exists notes text,
  add column if not exists registered_at timestamptz not null default now(),
  add column if not exists last_reevaluated_at timestamptz,
  add column if not exists reevaluation_status text not null default 'em_dia'
    check (reevaluation_status in ('pendente', 'em_dia', 'morador_inativo', 'abandonada')),
  add column if not exists reevaluation_notes text,
  add column if not exists last_report_at timestamptz,
  add column if not exists last_report_reason text;

alter table public.bicycle_spots
  add column if not exists wall_position integer,
  add column if not exists qr_code_value text,
  add column if not exists floor_plan_module_id text;

alter table public.allocations
  add column if not exists concession_type text not null default 'vitalicio'
    check (concession_type in ('vitalicio', 'determinado')),
  add column if not exists concession_end_date date,
  add column if not exists last_usage_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'allocations_concession_period_check'
      and conrelid = 'public.allocations'::regclass
  ) then
    alter table public.allocations
      add constraint allocations_concession_period_check
      check (concession_type = 'vitalicio' or concession_end_date is not null);
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bicycle_spots_set_updated_at on public.bicycle_spots;
create trigger bicycle_spots_set_updated_at
before update on public.bicycle_spots
for each row execute function public.set_updated_at();

drop trigger if exists bicycles_set_updated_at on public.bicycles;
create trigger bicycles_set_updated_at
before update on public.bicycles
for each row execute function public.set_updated_at();

-- Uma bicicleta também não pode ficar ativa em duas vagas simultaneamente.
create unique index if not exists allocations_one_active_bicycle
  on public.allocations (bicycle_id) where status = 'active';

create unique index if not exists bicycles_unique_tag_per_condominium
  on public.bicycles (condominium_id, tag_number)
  where tag_number is not null and btrim(tag_number) <> '';

-- Foto não fica mais limitada ao JSON do navegador. Use o caminho:
-- bike-photos/<condominium_id>/<bicycle_id>/<arquivo>.
insert into storage.buckets (id, name, public)
values ('bike-photos', 'bike-photos', false)
on conflict (id) do nothing;

drop policy if exists "members read bike photos in their condominium" on storage.objects;
create policy "members read bike photos in their condominium"
on storage.objects for select to authenticated
using (
  bucket_id = 'bike-photos'
  and public.can_access_condominium((storage.foldername(name))[1]::uuid)
);

drop policy if exists "managers manage bike photos in their condominium" on storage.objects;
create policy "managers manage bike photos in their condominium"
on storage.objects for all to authenticated
using (
  bucket_id = 'bike-photos'
  and public.can_manage_condominium((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'bike-photos'
  and public.can_manage_condominium((storage.foldername(name))[1]::uuid)
);

-- O vínculo é criado no banco, com bloqueio das linhas envolvidas. Isso evita
-- duas pessoas ocuparem a mesma vaga em uma disputa de cliques.
create or replace function public.assign_bicycle_to_spot(
  p_condominium_id uuid,
  p_spot_id uuid,
  p_bicycle_id uuid,
  p_concession_type text default 'determinado',
  p_concession_end_date date default null,
  p_note text default null
)
returns public.allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation public.allocations;
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para vincular vagas neste condomínio';
  end if;

  if p_concession_type not in ('vitalicio', 'determinado') then
    raise exception 'Tipo de concessão inválido';
  end if;
  if p_concession_type = 'determinado' and p_concession_end_date is null then
    raise exception 'Uma concessão por prazo determinado precisa de data final';
  end if;

  perform 1 from public.bicycle_spots
    where id = p_spot_id and condominium_id = p_condominium_id
    for update;
  if not found then
    raise exception 'Vaga não encontrada neste condomínio';
  end if;

  perform 1 from public.bicycles
    where id = p_bicycle_id and condominium_id = p_condominium_id
    for update;
  if not found then
    raise exception 'Bicicleta não encontrada neste condomínio';
  end if;

  if exists (
    select 1 from public.allocations
    where spot_id = p_spot_id and status = 'active'
  ) then
    raise exception 'Esta vaga já está ocupada';
  end if;

  if exists (
    select 1 from public.allocations
    where bicycle_id = p_bicycle_id and status = 'active'
  ) then
    raise exception 'Esta bicicleta já possui uma vaga ativa';
  end if;

  insert into public.allocations (condominium_id, spot_id, bicycle_id, concession_type, concession_end_date)
  values (p_condominium_id, p_spot_id, p_bicycle_id, p_concession_type, p_concession_end_date)
  returning * into v_allocation;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_condominium_id, auth.uid(), 'allocation_created', 'allocation', v_allocation.id,
    jsonb_build_object(
      'spot_id', p_spot_id,
      'bicycle_id', p_bicycle_id,
      'concession_type', p_concession_type,
      'concession_end_date', p_concession_end_date,
      'note', nullif(trim(p_note), '')
    )
  );

  return v_allocation;
end;
$$;

create or replace function public.release_spot_allocation(
  p_condominium_id uuid,
  p_allocation_id uuid,
  p_note text default null
)
returns public.allocations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allocation public.allocations;
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para liberar vagas neste condomínio';
  end if;

  select * into v_allocation
  from public.allocations
  where id = p_allocation_id
    and condominium_id = p_condominium_id
    and status = 'active'
  for update;
  if not found then
    raise exception 'Vínculo ativo não encontrado';
  end if;

  update public.allocations
  set status = 'released', released_at = now()
  where id = v_allocation.id
  returning * into v_allocation;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_condominium_id, auth.uid(), 'allocation_released', 'allocation', v_allocation.id,
    jsonb_build_object('spot_id', v_allocation.spot_id, 'bicycle_id', v_allocation.bicycle_id, 'note', nullif(trim(p_note), ''))
  );

  return v_allocation;
end;
$$;

revoke all on function public.assign_bicycle_to_spot(uuid, uuid, uuid, text, date, text) from public;
grant execute on function public.assign_bicycle_to_spot(uuid, uuid, uuid, text, date, text) to authenticated;
revoke all on function public.release_spot_allocation(uuid, uuid, text) from public;
grant execute on function public.release_spot_allocation(uuid, uuid, text) to authenticated;

-- A solicitação passa a ter um vínculo próprio com a bicicleta do catálogo quando
-- a migração gradual do snapshot estiver concluída. O campo de texto antigo fica
-- preservado para não perder os registros do piloto.
alter table public.spot_requests
  add column if not exists bicycle_record_id uuid references public.bicycles(id) on delete set null;

create index if not exists spot_requests_bicycle_record_idx
  on public.spot_requests(condominium_id, bicycle_record_id);
