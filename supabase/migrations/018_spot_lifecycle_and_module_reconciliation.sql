-- Ciclo de vida das vagas e reconciliação da planta.
--
-- 1. Preserva vagas removidas para auditoria, marcando-as como aposentadas.
-- 2. Libera, sem apagar o histórico, vínculos da estrutura substituída.
-- 3. Recupera floorPlanModuleId quando o setor corresponde exatamente a um
--    único módulo configurado.
-- 4. Impede novos vínculos em vagas aposentadas.

alter table public.bicycle_spots
  add column if not exists retired_at timestamptz,
  add column if not exists retirement_reason text;

drop index if exists public.bicycle_spots_location_number_unique;
create index if not exists bicycle_spots_current_per_condominium
  on public.bicycle_spots (condominium_id, retired_at);

create or replace function public.normalize_snapshot_spot_modules(p_payload jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  with configured_modules as (
    select
      module ->> 'id' as module_id,
      module ->> 'name' as module_name
    from jsonb_array_elements(coalesce(p_payload -> 'config' -> 'modules', '[]'::jsonb)) module
    where nullif(module ->> 'id', '') is not null
      and nullif(module ->> 'name', '') is not null
  ), resolved_spots as (
    select
      spot.value,
      spot.ordinality,
      (
        select min(module.module_id)
        from configured_modules module
        where module.module_name = spot.value ->> 'sector'
      ) as matched_module_id,
      (
        select count(*)
        from configured_modules module
        where module.module_name = spot.value ->> 'sector'
      ) as match_count
    from jsonb_array_elements(coalesce(p_payload -> 'spots', '[]'::jsonb))
      with ordinality as spot(value, ordinality)
  ), normalized_spots as (
    select coalesce(
      jsonb_agg(
        case
          when nullif(value ->> 'floorPlanModuleId', '') is null
            and match_count = 1
          then value || jsonb_build_object('floorPlanModuleId', matched_module_id)
          else value
        end
        order by ordinality
      ),
      '[]'::jsonb
    ) as value
    from resolved_spots
  )
  select jsonb_set(coalesce(p_payload, '{}'::jsonb), '{spots}', normalized_spots.value, true)
  from normalized_spots;
$$;

create or replace function public.sync_snapshot_spots_from_payload(
  p_condominium_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb := public.normalize_snapshot_spot_modules(p_payload);
  v_synced integer := 0;
begin
  if jsonb_typeof(v_payload) <> 'object' or jsonb_typeof(v_payload -> 'spots') <> 'array' then
    raise exception 'SNAPSHOT_INVALIDO: a planta precisa conter uma lista de vagas';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_payload -> 'spots') spot
    where nullif(spot ->> 'id', '') is null
       or nullif(spot ->> 'spotNumber', '') is null
       or nullif(spot ->> 'sector', '') is null
  ) then
    raise exception 'SNAPSHOT_INVALIDO: toda vaga precisa de id, número e setor';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_payload -> 'spots') spot
    group by spot ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'SNAPSHOT_INVALIDO: há vagas com o mesmo id interno';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(v_payload -> 'spots') spot
    group by coalesce(nullif(spot ->> 'floorPlanModuleId', ''), spot ->> 'sector', spot ->> 'id'),
             spot ->> 'spotNumber'
    having count(*) > 1
  ) then
    raise exception 'SNAPSHOT_INVALIDO: há duas vagas com o mesmo número no mesmo módulo';
  end if;

  -- A troca limpa da estrutura encerra os vínculos das vagas ausentes, mas
  -- conserva allocations e vagas para histórico e auditoria.
  with released as (
    update public.allocations allocation
    set status = 'released', released_at = coalesce(allocation.released_at, now())
    from public.bicycle_spots spot
    where allocation.spot_id = spot.id
      and allocation.condominium_id = p_condominium_id
      and spot.condominium_id = p_condominium_id
      and allocation.status = 'active'
      and not exists (
        select 1
        from jsonb_array_elements(v_payload -> 'spots') incoming
        where incoming ->> 'id' = spot.legacy_id
      )
    returning allocation.id, allocation.spot_id, allocation.bicycle_id
  )
  insert into public.audit_logs (
    condominium_id, actor_id, action, entity_type, entity_id, metadata
  )
  select
    p_condominium_id,
    auth.uid(),
    'allocation_released_by_structure_change',
    'allocation',
    released.id,
    jsonb_build_object(
      'spot_id', released.spot_id,
      'bicycle_id', released.bicycle_id,
      'reason', 'spot_removed_from_current_snapshot'
    )
  from released;

  update public.bicycle_spots spot
  set retired_at = coalesce(spot.retired_at, now()),
      retirement_reason = 'removed_from_current_snapshot'
  where spot.condominium_id = p_condominium_id
    and not exists (
      select 1
      from jsonb_array_elements(v_payload -> 'spots') incoming
      where incoming ->> 'id' = spot.legacy_id
    );

  if exists (
    with incoming as (
      select
        spot ->> 'id' as legacy_id,
        coalesce(nullif(spot ->> 'floorPlanModuleId', ''), spot ->> 'sector', spot ->> 'id') as location_key,
        spot ->> 'spotNumber' as spot_number
      from jsonb_array_elements(v_payload -> 'spots') spot
    )
    select 1
    from incoming
    join public.bicycle_spots existing
      on existing.condominium_id = p_condominium_id
     and existing.retired_at is null
     and existing.location_key = incoming.location_key
     and existing.spot_number = incoming.spot_number
     and existing.legacy_id is distinct from incoming.legacy_id
  ) then
    raise exception 'SNAPSHOT_INVALIDO: uma vaga nova colide com uma vaga operacional existente';
  end if;

  insert into public.bicycle_spots (
    condominium_id, legacy_id, location_key, spot_number, sector, hook_type,
    max_weight_kg, wall_position, qr_code_value, floor_plan_module_id,
    retired_at, retirement_reason
  )
  select
    p_condominium_id,
    spot ->> 'id',
    coalesce(nullif(spot ->> 'floorPlanModuleId', ''), spot ->> 'sector', spot ->> 'id'),
    spot ->> 'spotNumber',
    spot ->> 'sector',
    coalesce(nullif(spot ->> 'hookType', ''), 'Gancho não informado'),
    coalesce(nullif(spot ->> 'maxWeightKg', '')::integer, 1),
    nullif(spot ->> 'wallPosition', '')::integer,
    nullif(spot ->> 'qrCodeValue', ''),
    nullif(spot ->> 'floorPlanModuleId', ''),
    null,
    null
  from jsonb_array_elements(v_payload -> 'spots') spot
  on conflict (condominium_id, legacy_id) where legacy_id is not null
  do update set
    location_key = excluded.location_key,
    spot_number = excluded.spot_number,
    sector = excluded.sector,
    hook_type = excluded.hook_type,
    max_weight_kg = excluded.max_weight_kg,
    wall_position = excluded.wall_position,
    qr_code_value = excluded.qr_code_value,
    floor_plan_module_id = excluded.floor_plan_module_id,
    retired_at = null,
    retirement_reason = null;

  get diagnostics v_synced = row_count;
  return v_synced;
end;
$$;

create or replace function public.save_condominium_snapshot(
  p_condominium_id uuid,
  p_payload jsonb,
  p_expected_version integer default null
)
returns table (version integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_version integer;
  v_next_version integer;
  v_payload jsonb := public.normalize_snapshot_spot_modules(p_payload);
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para salvar este condomínio';
  end if;

  select snapshot.version into v_current_version
  from public.condominium_snapshots snapshot
  where snapshot.condominium_id = p_condominium_id
  for update;

  if not found then
    if p_expected_version is not null then
      raise exception using errcode = '40001', message = 'CONFLITO_DE_SINCRONIZACAO: o snapshot foi alterado antes da criação local';
    end if;
    v_next_version := 1;
    insert into public.condominium_snapshots (condominium_id, payload, version, updated_at, updated_by)
    values (p_condominium_id, v_payload, v_next_version, now(), auth.uid());
  else
    if p_expected_version is distinct from v_current_version then
      raise exception using errcode = '40001', message = 'CONFLITO_DE_SINCRONIZACAO: existe uma versão mais recente na nuvem';
    end if;
    v_next_version := v_current_version + 1;
    update public.condominium_snapshots
    set payload = v_payload, version = v_next_version, updated_at = now(), updated_by = auth.uid()
    where condominium_id = p_condominium_id;
  end if;

  perform public.sync_snapshot_spots_from_payload(p_condominium_id, v_payload);
  return query select v_next_version, now();
end;
$$;

create or replace function public.ensure_active_allocation_uses_current_spot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'active' and exists (
    select 1
    from public.bicycle_spots spot
    where spot.id = new.spot_id
      and (spot.condominium_id <> new.condominium_id or spot.retired_at is not null)
  ) then
    raise exception 'Não é possível vincular uma bicicleta a uma vaga aposentada ou de outro condomínio';
  end if;
  return new;
end;
$$;

drop trigger if exists allocations_require_current_spot on public.allocations;
create trigger allocations_require_current_spot
before insert or update of spot_id, condominium_id, status on public.allocations
for each row execute function public.ensure_active_allocation_uses_current_spot();

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
language sql
stable
security definer
set search_path = public
as $$
  select condominium.name, spot.spot_number, spot.sector, spot.hook_type,
    case when allocation.id is null then 'livre' else 'ocupada' end,
    bicycle.photo_url, bicycle.brand_model, bicycle.color, bicycle.tag_number
  from public.bicycle_spots spot
  join public.condominiums condominium on condominium.id = spot.condominium_id
  left join public.allocations allocation on allocation.spot_id = spot.id and allocation.status = 'active'
  left join public.bicycles bicycle on bicycle.id = allocation.bicycle_id
  where spot.public_slug = p_slug
    and spot.retired_at is null;
$$;

-- Reconcilia os snapshots existentes. O incremento de versão força clientes
-- com cópias antigas a tratar a atualização como concorrente em vez de sobrescrever.
do $$
declare
  snapshot record;
  normalized_payload jsonb;
begin
  for snapshot in
    select condominium_id, payload
    from public.condominium_snapshots
    for update
  loop
    normalized_payload := public.normalize_snapshot_spot_modules(snapshot.payload);
    perform public.sync_snapshot_spots_from_payload(snapshot.condominium_id, normalized_payload);

    if normalized_payload is distinct from snapshot.payload then
      update public.condominium_snapshots
      set payload = normalized_payload,
          version = version + 1,
          updated_at = now()
      where condominium_id = snapshot.condominium_id;
    end if;
  end loop;
end;
$$;

-- Só recria a unicidade depois da reconciliação, pois duas gerações da planta
-- podem ter usado a mesma localização antes de a geração anterior ser aposentada.
create unique index bicycle_spots_location_number_unique
  on public.bicycle_spots (condominium_id, location_key, spot_number)
  where retired_at is null;

revoke all on function public.normalize_snapshot_spot_modules(jsonb) from public;
revoke all on function public.sync_snapshot_spots_from_payload(uuid, jsonb) from public;
revoke all on function public.save_condominium_snapshot(uuid, jsonb, integer) from public;
grant execute on function public.save_condominium_snapshot(uuid, jsonb, integer) to authenticated;
grant execute on function public.get_public_spot(uuid) to anon, authenticated;
