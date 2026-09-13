-- Migração definitiva do piloto para o modelo operacional normalizado.
-- Baseada na auditoria: números de vagas se repetem por módulo, portanto
-- a identidade física é condomínio + módulo + número, nunca somente número.
-- Execute após 009 a 012. Esta migração não apaga nenhum snapshot.

alter table public.bicycle_spots
  drop constraint if exists bicycle_spots_condominium_id_spot_number_key;

alter table public.bicycle_spots
  add column if not exists location_key text not null default 'legacy';

create unique index if not exists bicycle_spots_location_number_unique
  on public.bicycle_spots (condominium_id, location_key, spot_number);

create or replace function public.migrate_snapshot_to_operations(p_condominium_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_spots integer := 0;
  v_catalog_bikes integer := 0;
  v_recovered_bikes integer := 0;
  v_allocations integer := 0;
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para migrar este condomínio';
  end if;

  select payload into v_payload
  from public.condominium_snapshots
  where condominium_id = p_condominium_id;
  if v_payload is null then
    raise exception 'Nenhum snapshot encontrado para este condomínio';
  end if;

  -- Pré-validações: falham antes de qualquer gravação caso o snapshot contenha
  -- uma ambiguidade que o banco não pode resolver sozinho.
  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) spot
    group by
      coalesce(nullif(spot ->> 'floorPlanModuleId', ''), nullif(spot ->> 'sector', ''), spot ->> 'id'),
      spot ->> 'spotNumber'
    having count(*) > 1
  ) then
    raise exception 'O snapshot possui vagas duplicadas dentro do mesmo módulo';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_payload -> 'registeredBikes', '[]'::jsonb)) bike
    group by bike ->> 'id'
    having count(*) > 1
  ) then
    raise exception 'O snapshot possui bicicletas com ID interno duplicado';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) spot
    cross join lateral (select spot -> 'currentAllocation' as allocation) allocation_data
    where jsonb_typeof(allocation_data.allocation) = 'object'
      and nullif(allocation_data.allocation ->> 'bicycleId', '') is not null
    group by allocation_data.allocation ->> 'bicycleId'
    having count(*) > 1
  ) then
    raise exception 'O snapshot possui uma bicicleta vinculada a mais de uma vaga';
  end if;

  -- A chave técnica de localização é o módulo da planta. O número continua
  -- sendo apenas o rótulo exibido para o usuário.
  insert into public.bicycle_spots (
    condominium_id, legacy_id, location_key, spot_number, sector, hook_type,
    max_weight_kg, wall_position, qr_code_value, floor_plan_module_id
  )
  select
    p_condominium_id,
    nullif(spot ->> 'id', ''),
    coalesce(nullif(spot ->> 'floorPlanModuleId', ''), nullif(spot ->> 'sector', ''), spot ->> 'id'),
    coalesce(nullif(spot ->> 'spotNumber', ''), 'Vaga sem número'),
    coalesce(nullif(spot ->> 'sector', ''), 'Setor não informado'),
    coalesce(nullif(spot ->> 'hookType', ''), 'Gancho não informado'),
    coalesce(nullif(spot ->> 'maxWeightKg', '')::integer, 1),
    nullif(spot ->> 'wallPosition', '')::integer,
    nullif(spot ->> 'qrCodeValue', ''),
    nullif(spot ->> 'floorPlanModuleId', '')
  from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) spot
  where nullif(spot ->> 'id', '') is not null
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
  get diagnostics v_spots = row_count;

  insert into public.bicycles (
    condominium_id, legacy_id, resident_name, apartment, block, resident_phone,
    resident_email, brand_model, color, tag_number, photo_url, category,
    serial_number, distinguishing_features, notes, registered_at,
    last_reevaluated_at, reevaluation_status, reevaluation_notes
  )
  select
    p_condominium_id,
    nullif(bike ->> 'id', ''),
    coalesce(nullif(bike ->> 'residentName', ''), 'Morador não informado'),
    coalesce(nullif(bike ->> 'apartment', ''), 'Não informado'),
    coalesce(nullif(bike ->> 'block', ''), 'Não informado'),
    nullif(bike ->> 'residentPhone', ''),
    nullif(bike ->> 'residentEmail', ''),
    coalesce(nullif(bike ->> 'brandModel', ''), 'Bicicleta sem modelo'),
    coalesce(nullif(bike ->> 'color', ''), 'Não informada'),
    nullif(bike ->> 'tagNumber', ''),
    nullif(bike ->> 'photoUrl', ''),
    nullif(bike ->> 'category', ''),
    nullif(bike ->> 'serialNumber', ''),
    nullif(bike ->> 'distinguishingFeatures', ''),
    nullif(bike ->> 'notes', ''),
    coalesce(nullif(bike ->> 'registeredAt', '')::timestamptz, now()),
    nullif(bike ->> 'lastReevaluatedAt', '')::timestamptz,
    coalesce(nullif(bike ->> 'reevaluationStatus', ''), 'em_dia'),
    nullif(bike ->> 'reevaluationNotes', '')
  from jsonb_array_elements(coalesce(v_payload -> 'registeredBikes', '[]'::jsonb)) bike
  where nullif(bike ->> 'id', '') is not null
  on conflict (condominium_id, legacy_id) where legacy_id is not null
  do update set
    resident_name = excluded.resident_name,
    apartment = excluded.apartment,
    block = excluded.block,
    resident_phone = excluded.resident_phone,
    resident_email = excluded.resident_email,
    brand_model = excluded.brand_model,
    color = excluded.color,
    tag_number = excluded.tag_number,
    photo_url = excluded.photo_url,
    category = excluded.category,
    serial_number = excluded.serial_number,
    distinguishing_features = excluded.distinguishing_features,
    notes = excluded.notes,
    registered_at = excluded.registered_at,
    last_reevaluated_at = excluded.last_reevaluated_at,
    reevaluation_status = excluded.reevaluation_status,
    reevaluation_notes = excluded.reevaluation_notes;
  get diagnostics v_catalog_bikes = row_count;

  -- Recupera ocupações antigas que não tinham bicycleId e não encontram uma
  -- bicicleta correspondente no catálogo. São registros explícitos, auditáveis
  -- e podem ser revisados depois sem perder a ocupação física.
  insert into public.bicycles (
    condominium_id, legacy_id, resident_name, apartment, block, resident_phone,
    resident_email, brand_model, color, tag_number, photo_url, category,
    serial_number, distinguishing_features, notes, registered_at, reevaluation_status
  )
  select
    p_condominium_id,
    'recovered-allocation:' || (spot ->> 'id'),
    coalesce(nullif(allocation_data.allocation ->> 'residentName', ''), 'Morador não informado'),
    coalesce(nullif(allocation_data.allocation ->> 'apartment', ''), 'Não informado'),
    coalesce(nullif(allocation_data.allocation ->> 'block', ''), 'Não informado'),
    nullif(allocation_data.allocation ->> 'residentPhone', ''),
    nullif(allocation_data.allocation ->> 'residentEmail', ''),
    coalesce(nullif(allocation_data.allocation -> 'bicycle' ->> 'brandModel', ''), 'Bicicleta sem modelo'),
    coalesce(nullif(allocation_data.allocation -> 'bicycle' ->> 'color', ''), 'Não informada'),
    null,
    nullif(allocation_data.allocation ->> 'photoUrl', ''),
    nullif(allocation_data.allocation -> 'bicycle' ->> 'category', ''),
    nullif(allocation_data.allocation -> 'bicycle' ->> 'serialNumber', ''),
    nullif(allocation_data.allocation -> 'bicycle' ->> 'distinguishingFeatures', ''),
    concat('Registro recuperado de vínculo antigo sem bicycleId. Selo original: ', coalesce(allocation_data.allocation -> 'bicycle' ->> 'tagNumber', 'não informado')),
    coalesce(nullif(allocation_data.allocation ->> 'allocatedAt', '')::timestamptz, now()),
    'pendente'
  from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) spot
  cross join lateral (select spot -> 'currentAllocation' as allocation) allocation_data
  where jsonb_typeof(allocation_data.allocation) = 'object'
    and (
      nullif(allocation_data.allocation ->> 'bicycleId', '') is null
      or not exists (
        select 1
        from public.bicycles existing
        where existing.condominium_id = p_condominium_id
          and existing.legacy_id = allocation_data.allocation ->> 'bicycleId'
      )
    )
  on conflict (condominium_id, legacy_id) where legacy_id is not null
  do update set
    resident_name = excluded.resident_name,
    apartment = excluded.apartment,
    block = excluded.block,
    resident_phone = excluded.resident_phone,
    resident_email = excluded.resident_email,
    brand_model = excluded.brand_model,
    color = excluded.color,
    photo_url = excluded.photo_url,
    category = excluded.category,
    serial_number = excluded.serial_number,
    distinguishing_features = excluded.distinguishing_features,
    notes = excluded.notes,
    registered_at = excluded.registered_at,
    reevaluation_status = excluded.reevaluation_status;
  get diagnostics v_recovered_bikes = row_count;

  update public.allocations
  set status = 'released', released_at = now()
  where condominium_id = p_condominium_id and status = 'active';

  insert into public.allocations (
    condominium_id, spot_id, bicycle_id, concession_type, concession_end_date,
    allocated_at, last_usage_at
  )
  select
    p_condominium_id,
    db_spot.id,
    coalesce(catalog_bike.id, recovered_bike.id),
    coalesce(nullif(allocation_data.allocation ->> 'concessionType', ''), 'vitalicio'),
    case
      when coalesce(nullif(allocation_data.allocation ->> 'concessionType', ''), 'vitalicio') = 'determinado'
      then coalesce(nullif(allocation_data.allocation ->> 'endDate', '')::date, current_date)
      else null
    end,
    coalesce(nullif(allocation_data.allocation ->> 'allocatedAt', '')::timestamptz, now()),
    nullif(spot ->> 'lastUsageDate', '')::timestamptz
  from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) spot
  cross join lateral (select spot -> 'currentAllocation' as allocation) allocation_data
  join public.bicycle_spots db_spot
    on db_spot.condominium_id = p_condominium_id
    and db_spot.legacy_id = spot ->> 'id'
  left join public.bicycles catalog_bike
    on catalog_bike.condominium_id = p_condominium_id
    and catalog_bike.legacy_id = allocation_data.allocation ->> 'bicycleId'
  left join public.bicycles recovered_bike
    on recovered_bike.condominium_id = p_condominium_id
    and recovered_bike.legacy_id = 'recovered-allocation:' || (spot ->> 'id')
  where jsonb_typeof(allocation_data.allocation) = 'object'
    and coalesce(catalog_bike.id, recovered_bike.id) is not null;
  get diagnostics v_allocations = row_count;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, metadata)
  values (
    p_condominium_id, auth.uid(), 'snapshot_migrated', 'condominium',
    jsonb_build_object(
      'spots', v_spots,
      'catalog_bikes', v_catalog_bikes,
      'recovered_bikes', v_recovered_bikes,
      'allocations', v_allocations
    )
  );

  return jsonb_build_object(
    'spots', v_spots,
    'catalog_bikes', v_catalog_bikes,
    'recovered_bikes', v_recovered_bikes,
    'allocations', v_allocations
  );
end;
$$;

revoke all on function public.migrate_snapshot_to_operations(uuid) from public;
grant execute on function public.migrate_snapshot_to_operations(uuid) to authenticated;
