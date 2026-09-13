-- Transição única do piloto para os registros normalizados.
-- Execute após 009_production_operations.sql, uma vez para cada condomínio
-- que já tenha dados em condominium_snapshots.

alter table public.bicycle_spots
  add column if not exists legacy_id text;

alter table public.bicycles
  add column if not exists legacy_id text;

create unique index if not exists bicycle_spots_legacy_id_per_condominium
  on public.bicycle_spots (condominium_id, legacy_id)
  where legacy_id is not null;

create unique index if not exists bicycles_legacy_id_per_condominium
  on public.bicycles (condominium_id, legacy_id)
  where legacy_id is not null;

create or replace function public.migrate_snapshot_to_operations(p_condominium_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_spots integer := 0;
  v_bikes integer := 0;
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

  insert into public.bicycle_spots (
    condominium_id, legacy_id, spot_number, sector, hook_type, max_weight_kg,
    wall_position, qr_code_value, floor_plan_module_id
  )
  select
    p_condominium_id,
    nullif(spot ->> 'id', ''),
    coalesce(nullif(spot ->> 'spotNumber', ''), 'Vaga sem número'),
    coalesce(nullif(spot ->> 'sector', ''), 'Setor não informado'),
    coalesce(nullif(spot ->> 'hookType', ''), 'Gancho não informado'),
    coalesce(nullif(spot ->> 'maxWeightKg', '')::integer, 1),
    nullif(spot ->> 'wallPosition', '')::integer,
    nullif(spot ->> 'qrCodeValue', ''),
    nullif(spot ->> 'floorPlanModuleId', '')
  from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) spot
  where nullif(spot ->> 'id', '') is not null
  on conflict (condominium_id, spot_number)
  do update set
    legacy_id = excluded.legacy_id,
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
  get diagnostics v_bikes = row_count;

  -- Durante esta única importação, o snapshot é a referência. Vínculos ativos
  -- anteriores são encerrados e recriados conforme a fotografia atual.
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
    db_bike.id,
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
  join public.bicycles db_bike
    on db_bike.condominium_id = p_condominium_id
    and db_bike.legacy_id = allocation_data.allocation ->> 'bicycleId'
  where jsonb_typeof(allocation_data.allocation) = 'object';
  get diagnostics v_allocations = row_count;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, metadata)
  values (
    p_condominium_id, auth.uid(), 'snapshot_migrated', 'condominium',
    jsonb_build_object('spots', v_spots, 'bicycles', v_bikes, 'allocations', v_allocations)
  );

  return jsonb_build_object('spots', v_spots, 'bicycles', v_bikes, 'allocations', v_allocations);
end;
$$;

revoke all on function public.migrate_snapshot_to_operations(uuid) from public;
grant execute on function public.migrate_snapshot_to_operations(uuid) to authenticated;
