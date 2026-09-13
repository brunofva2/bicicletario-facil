-- Mantém a planta salva no snapshot e a tabela operacional bicycle_spots em
-- sincronia. O número de vagas é dinâmico: cada módulo pode ter a capacidade
-- que o usuário definir. Não há qualquer limite de 24 vagas.

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
  v_synced integer := 0;
begin
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_payload -> 'spots') <> 'array' then
    raise exception 'SNAPSHOT_INVALIDO: a planta precisa conter uma lista de vagas';
  end if;

  -- Cada vaga precisa de uma identidade técnica estável para que reenvios,
  -- modo offline e diferentes dispositivos atualizem a mesma vaga.
  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'spots') spot
    where nullif(spot ->> 'id', '') is null
       or nullif(spot ->> 'spotNumber', '') is null
       or nullif(spot ->> 'sector', '') is null
  ) then
    raise exception 'SNAPSHOT_INVALIDO: toda vaga precisa de id, número e setor';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'spots') spot
    group by spot ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'SNAPSHOT_INVALIDO: há vagas com o mesmo id interno';
  end if;

  -- A identidade física é módulo + número. Para dados antigos sem módulo, o
  -- setor continua como fallback, sem impedir módulos com tamanhos diferentes.
  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'spots') spot
    group by coalesce(nullif(spot ->> 'floorPlanModuleId', ''), spot ->> 'sector', spot ->> 'id'), spot ->> 'spotNumber'
    having count(*) > 1
  ) then
    raise exception 'SNAPSHOT_INVALIDO: há duas vagas com o mesmo número no mesmo módulo';
  end if;

  -- Impede uma planta nova de ocupar silenciosamente uma localização já usada
  -- por uma vaga operacional com outro id técnico.
  if exists (
    with incoming as (
      select
        spot ->> 'id' as legacy_id,
        coalesce(nullif(spot ->> 'floorPlanModuleId', ''), spot ->> 'sector', spot ->> 'id') as location_key,
        spot ->> 'spotNumber' as spot_number
      from jsonb_array_elements(p_payload -> 'spots') spot
    )
    select 1
    from incoming
    join public.bicycle_spots existing
      on existing.condominium_id = p_condominium_id
     and existing.location_key = incoming.location_key
     and existing.spot_number = incoming.spot_number
     and existing.legacy_id is distinct from incoming.legacy_id
  ) then
    raise exception 'SNAPSHOT_INVALIDO: uma vaga nova colide com uma vaga operacional existente';
  end if;

  insert into public.bicycle_spots (
    condominium_id, legacy_id, location_key, spot_number, sector, hook_type,
    max_weight_kg, wall_position, qr_code_value, floor_plan_module_id
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
    nullif(spot ->> 'floorPlanModuleId', '')
  from jsonb_array_elements(p_payload -> 'spots') spot
  on conflict (condominium_id, legacy_id) where legacy_id is not null
  do update set
    location_key = excluded.location_key,
    spot_number = excluded.spot_number,
    sector = excluded.sector,
    hook_type = excluded.hook_type,
    max_weight_kg = excluded.max_weight_kg,
    wall_position = excluded.wall_position,
    qr_code_value = excluded.qr_code_value,
    floor_plan_module_id = excluded.floor_plan_module_id;

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
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para salvar este condomínio';
  end if;

  select s.version into v_current_version
  from public.condominium_snapshots s
  where s.condominium_id = p_condominium_id
  for update;

  if not found then
    if p_expected_version is not null then
      raise exception using errcode = '40001', message = 'CONFLITO_DE_SINCRONIZACAO: o snapshot foi alterado antes da criação local';
    end if;
    v_next_version := 1;
    insert into public.condominium_snapshots (condominium_id, payload, version, updated_at, updated_by)
    values (p_condominium_id, p_payload, v_next_version, now(), auth.uid());
  else
    if p_expected_version is distinct from v_current_version then
      raise exception using errcode = '40001', message = 'CONFLITO_DE_SINCRONIZACAO: existe uma versão mais recente na nuvem';
    end if;
    v_next_version := v_current_version + 1;
    update public.condominium_snapshots
    set payload = p_payload, version = v_next_version, updated_at = now(), updated_by = auth.uid()
    where condominium_id = p_condominium_id;
  end if;

  -- Se a validação ou o upsert falhar, PostgreSQL desfaz também o snapshot.
  perform public.sync_snapshot_spots_from_payload(p_condominium_id, p_payload);
  return query select v_next_version, now();
end;
$$;

revoke all on function public.sync_snapshot_spots_from_payload(uuid, jsonb) from public;
revoke all on function public.save_condominium_snapshot(uuid, jsonb, integer) from public;
grant execute on function public.save_condominium_snapshot(uuid, jsonb, integer) to authenticated;
