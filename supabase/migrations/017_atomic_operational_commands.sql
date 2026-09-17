-- Comandos operacionais atômicos usados pelo frontend.
-- Os IDs do snapshot são textos estáveis (legacy_id); UUIDs permanecem internos
-- ao banco. Execute depois da migração 016.

alter table public.bicycles
  add column if not exists archived_at timestamptz;

do $$
begin
  if exists (
    select 1 from public.bicycles
    where archived_at is null and nullif(btrim(tag_number), '') is not null
    group by condominium_id, lower(btrim(tag_number)) having count(*) > 1
  ) then raise exception 'Existem selos duplicados no mesmo condomínio; corrija antes da migração 017'; end if;
  if exists (
    select 1 from public.bicycles
    where archived_at is null and nullif(btrim(serial_number), '') is not null
    group by condominium_id, lower(btrim(serial_number)) having count(*) > 1
  ) then raise exception 'Existem números de série duplicados no mesmo condomínio; corrija antes da migração 017'; end if;
end;
$$;

drop index if exists public.bicycles_unique_tag_per_condominium;
create unique index bicycles_unique_tag_per_condominium
  on public.bicycles (condominium_id, lower(btrim(tag_number)))
  where archived_at is null and tag_number is not null and btrim(tag_number) <> '';
create unique index if not exists bicycles_unique_serial_per_condominium
  on public.bicycles (condominium_id, lower(btrim(serial_number)))
  where archived_at is null and serial_number is not null and btrim(serial_number) <> '';

create or replace function public.upsert_bicycle_from_payload(
  p_condominium_id uuid,
  p_bicycle jsonb
)
returns public.bicycles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bicycle public.bicycles;
begin
  if jsonb_typeof(p_bicycle) <> 'object'
     or nullif(btrim(p_bicycle ->> 'id'), '') is null
     or nullif(btrim(p_bicycle ->> 'residentName'), '') is null
     or nullif(btrim(p_bicycle ->> 'apartment'), '') is null
     or nullif(btrim(p_bicycle ->> 'block'), '') is null
     or nullif(btrim(p_bicycle ->> 'brandModel'), '') is null
     or nullif(btrim(p_bicycle ->> 'color'), '') is null then
    raise exception 'BICICLETA_INVALIDA: identificação, morador, unidade, modelo e cor são obrigatórios';
  end if;

  insert into public.bicycles (
    condominium_id, legacy_id, resident_name, apartment, block, resident_phone,
    resident_email, brand_model, color, tag_number, photo_url, category,
    serial_number, distinguishing_features, notes, registered_at,
    last_reevaluated_at, reevaluation_status, reevaluation_notes,
    last_report_at, last_report_reason, archived_at
  ) values (
    p_condominium_id,
    btrim(p_bicycle ->> 'id'),
    btrim(p_bicycle ->> 'residentName'),
    btrim(p_bicycle ->> 'apartment'),
    btrim(p_bicycle ->> 'block'),
    nullif(btrim(p_bicycle ->> 'residentPhone'), ''),
    nullif(btrim(p_bicycle ->> 'residentEmail'), ''),
    btrim(p_bicycle ->> 'brandModel'),
    btrim(p_bicycle ->> 'color'),
    nullif(btrim(p_bicycle ->> 'tagNumber'), ''),
    nullif(p_bicycle ->> 'photoUrl', ''),
    nullif(btrim(p_bicycle ->> 'category'), ''),
    nullif(btrim(p_bicycle ->> 'serialNumber'), ''),
    nullif(btrim(p_bicycle ->> 'distinguishingFeatures'), ''),
    nullif(btrim(p_bicycle ->> 'notes'), ''),
    coalesce(nullif(p_bicycle ->> 'registeredAt', '')::timestamptz, now()),
    nullif(p_bicycle ->> 'lastReevaluatedAt', '')::timestamptz,
    coalesce(nullif(p_bicycle ->> 'reevaluationStatus', ''), 'em_dia'),
    nullif(btrim(p_bicycle ->> 'reevaluationNotes'), ''),
    nullif(p_bicycle ->> 'lastReportAt', '')::timestamptz,
    nullif(btrim(p_bicycle ->> 'lastReportReason'), ''),
    null
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
    tag_number = excluded.tag_number,
    photo_url = excluded.photo_url,
    category = excluded.category,
    serial_number = excluded.serial_number,
    distinguishing_features = excluded.distinguishing_features,
    notes = excluded.notes,
    registered_at = excluded.registered_at,
    last_reevaluated_at = excluded.last_reevaluated_at,
    reevaluation_status = excluded.reevaluation_status,
    reevaluation_notes = excluded.reevaluation_notes,
    last_report_at = excluded.last_report_at,
    last_report_reason = excluded.last_report_reason,
    archived_at = null
  returning * into v_bicycle;

  return v_bicycle;
end;
$$;

create or replace function public.sync_snapshot_bicycles_from_payload(
  p_condominium_id uuid,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bicycle jsonb;
  v_count integer := 0;
begin
  if jsonb_typeof(p_payload) <> 'object'
     or jsonb_typeof(p_payload -> 'registeredBikes') <> 'array' then
    raise exception 'SNAPSHOT_INVALIDO: o catálogo precisa conter uma lista de bicicletas';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payload -> 'registeredBikes') bike
    group by bike ->> 'id'
    having nullif(btrim(bike ->> 'id'), '') is null or count(*) > 1
  ) then
    raise exception 'SNAPSHOT_INVALIDO: há bicicletas sem ID ou com ID duplicado';
  end if;

  for v_bicycle in select value from jsonb_array_elements(p_payload -> 'registeredBikes')
  loop
    perform public.upsert_bicycle_from_payload(p_condominium_id, v_bicycle);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.sync_snapshot_bicycles_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_snapshot_bicycles_from_payload(new.condominium_id, new.payload);
  return new;
end;
$$;

drop trigger if exists condominium_snapshot_sync_bicycles on public.condominium_snapshots;
create trigger condominium_snapshot_sync_bicycles
after insert or update of payload on public.condominium_snapshots
for each row execute function public.sync_snapshot_bicycles_trigger();

create or replace function public.assign_bicycle_to_spot_by_legacy_id(
  p_condominium_id uuid,
  p_spot_legacy_id text,
  p_bicycle jsonb,
  p_concession_type text default 'determinado',
  p_concession_end_date date default null,
  p_request_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spot public.bicycle_spots;
  v_bicycle public.bicycles;
  v_allocation public.allocations;
  v_request public.spot_requests;
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para vincular vagas neste condomínio';
  end if;
  if nullif(btrim(p_spot_legacy_id), '') is null then
    raise exception 'Vaga sem identificação técnica';
  end if;
  if p_concession_type not in ('vitalicio', 'determinado') then
    raise exception 'Tipo de concessão inválido';
  end if;
  if p_concession_type = 'determinado' and p_concession_end_date is null then
    raise exception 'Uma concessão por prazo determinado precisa de data final';
  end if;

  select * into v_spot
  from public.bicycle_spots
  where condominium_id = p_condominium_id and legacy_id = p_spot_legacy_id
  for update;
  if not found then
    raise exception 'Vaga não encontrada neste condomínio';
  end if;

  select * into v_bicycle
  from public.upsert_bicycle_from_payload(p_condominium_id, p_bicycle);
  perform 1 from public.bicycles where id = v_bicycle.id for update;

  if exists (select 1 from public.allocations where spot_id = v_spot.id and status = 'active') then
    raise exception 'Esta vaga já está ocupada';
  end if;
  if exists (select 1 from public.allocations where bicycle_id = v_bicycle.id and status = 'active') then
    raise exception 'Esta bicicleta já possui uma vaga ativa';
  end if;

  if p_request_id is not null then
    select * into v_request
    from public.spot_requests
    where id = p_request_id and condominium_id = p_condominium_id
    for update;
    if not found then raise exception 'Solicitação não encontrada neste condomínio'; end if;
    if v_request.status not in ('pending', 'waiting_list') or v_request.request_type <> 'vaga' then
      raise exception 'A solicitação não está aberta para atribuição de vaga';
    end if;
    if v_request.bicycle_id is not null and v_request.bicycle_id <> (p_bicycle ->> 'id') then
      raise exception 'A solicitação pertence a outra bicicleta';
    end if;
  end if;

  insert into public.allocations (
    condominium_id, spot_id, bicycle_id, concession_type, concession_end_date
  ) values (
    p_condominium_id, v_spot.id, v_bicycle.id, p_concession_type, p_concession_end_date
  ) returning * into v_allocation;

  if p_request_id is not null then
    update public.spot_requests
    set status = 'approved', assigned_spot_id = v_spot.id,
        bicycle_id = v_bicycle.legacy_id, bicycle_record_id = v_bicycle.id,
        decision_note = nullif(btrim(p_note), ''), decided_at = now(), decided_by = auth.uid()
    where id = p_request_id;
  end if;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    p_condominium_id, auth.uid(), 'allocation_created', 'allocation', v_allocation.id,
    jsonb_build_object('spot_id', v_spot.id, 'spot_legacy_id', v_spot.legacy_id,
      'bicycle_id', v_bicycle.id, 'bicycle_legacy_id', v_bicycle.legacy_id,
      'request_id', p_request_id, 'concession_type', p_concession_type,
      'concession_end_date', p_concession_end_date, 'note', nullif(btrim(p_note), ''))
  );

  return jsonb_build_object('allocation_id', v_allocation.id, 'spot_id', v_spot.id,
    'bicycle_id', v_bicycle.id, 'request_id', p_request_id);
end;
$$;

create or replace function public.release_spot_allocation_by_legacy_id(
  p_condominium_id uuid,
  p_spot_legacy_id text,
  p_note text default null
)
returns jsonb
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
  select allocation.* into v_allocation
  from public.allocations allocation
  join public.bicycle_spots spot on spot.id = allocation.spot_id
  where allocation.condominium_id = p_condominium_id
    and spot.legacy_id = p_spot_legacy_id and allocation.status = 'active'
  for update of allocation;
  if not found then raise exception 'Vínculo ativo não encontrado'; end if;

  update public.allocations set status = 'released', released_at = now()
  where id = v_allocation.id returning * into v_allocation;
  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_condominium_id, auth.uid(), 'allocation_released', 'allocation', v_allocation.id,
    jsonb_build_object('spot_id', v_allocation.spot_id, 'bicycle_id', v_allocation.bicycle_id,
      'spot_legacy_id', p_spot_legacy_id, 'note', nullif(btrim(p_note), '')));
  return jsonb_build_object('allocation_id', v_allocation.id, 'bicycle_id', v_allocation.bicycle_id);
end;
$$;

create or replace function public.update_spot_concession_by_legacy_id(
  p_condominium_id uuid,
  p_spot_legacy_id text,
  p_concession_type text,
  p_concession_end_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_allocation public.allocations;
begin
  if not public.can_manage_condominium(p_condominium_id) then raise exception 'Sem permissão para alterar concessões'; end if;
  if p_concession_type not in ('vitalicio', 'determinado')
     or (p_concession_type = 'determinado' and p_concession_end_date is null) then
    raise exception 'Concessão ou data final inválida';
  end if;
  select allocation.* into v_allocation
  from public.allocations allocation join public.bicycle_spots spot on spot.id = allocation.spot_id
  where allocation.condominium_id = p_condominium_id
    and spot.legacy_id = p_spot_legacy_id and allocation.status = 'active'
  for update of allocation;
  if not found then raise exception 'Vínculo ativo não encontrado'; end if;
  update public.allocations
  set concession_type = p_concession_type,
      concession_end_date = case when p_concession_type = 'determinado' then p_concession_end_date else null end
  where id = v_allocation.id returning * into v_allocation;
  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_condominium_id, auth.uid(), 'allocation_concession_updated', 'allocation', v_allocation.id,
    jsonb_build_object('concession_type', p_concession_type, 'concession_end_date', p_concession_end_date));
  return jsonb_build_object('allocation_id', v_allocation.id);
end;
$$;

create or replace function public.register_spot_usage_by_legacy_id(
  p_condominium_id uuid,
  p_spot_legacy_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_allocation public.allocations;
begin
  if not public.can_manage_condominium(p_condominium_id) then raise exception 'Sem permissão para registrar uso'; end if;
  select allocation.* into v_allocation
  from public.allocations allocation join public.bicycle_spots spot on spot.id = allocation.spot_id
  where allocation.condominium_id = p_condominium_id
    and spot.legacy_id = p_spot_legacy_id and allocation.status = 'active'
  for update of allocation;
  if not found then raise exception 'Vínculo ativo não encontrado'; end if;
  update public.allocations set last_usage_at = now() where id = v_allocation.id returning * into v_allocation;
  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_condominium_id, auth.uid(), 'spot_usage_registered', 'allocation', v_allocation.id,
    jsonb_build_object('spot_legacy_id', p_spot_legacy_id, 'used_at', v_allocation.last_usage_at));
  return jsonb_build_object('allocation_id', v_allocation.id, 'last_usage_at', v_allocation.last_usage_at);
end;
$$;

create or replace function public.archive_bicycle_by_legacy_id(
  p_condominium_id uuid,
  p_bicycle_legacy_id text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bicycle public.bicycles;
  v_allocation public.allocations;
begin
  if not public.can_manage_condominium(p_condominium_id) then raise exception 'Sem permissão para excluir bicicletas'; end if;
  select * into v_bicycle from public.bicycles
  where condominium_id = p_condominium_id and legacy_id = p_bicycle_legacy_id for update;
  if not found then
    insert into public.audit_logs (condominium_id, actor_id, action, entity_type, metadata)
    values (p_condominium_id, auth.uid(), 'bicycle_archive_not_persisted', 'bicycle',
      jsonb_build_object('bicycle_legacy_id', p_bicycle_legacy_id, 'note', nullif(btrim(p_note), '')));
    return jsonb_build_object('bicycle_id', null, 'already_absent', true);
  end if;
  select * into v_allocation from public.allocations
  where condominium_id = p_condominium_id and bicycle_id = v_bicycle.id and status = 'active' for update;
  if found then
    update public.allocations set status = 'released', released_at = now() where id = v_allocation.id;
  end if;
  update public.bicycles set archived_at = now() where id = v_bicycle.id;
  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_condominium_id, auth.uid(), 'bicycle_archived', 'bicycle', v_bicycle.id,
    jsonb_build_object('bicycle_legacy_id', p_bicycle_legacy_id,
      'released_allocation_id', v_allocation.id, 'note', nullif(btrim(p_note), '')));
  return jsonb_build_object('bicycle_id', v_bicycle.id, 'released_allocation_id', v_allocation.id);
end;
$$;

create or replace function public.decide_operational_request(
  p_condominium_id uuid,
  p_request_id uuid,
  p_action text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_request public.spot_requests;
begin
  if not public.can_manage_condominium(p_condominium_id) then raise exception 'Sem permissão para decidir solicitações'; end if;
  if p_action not in ('reject', 'complete', 'convert_to_occurrence') then raise exception 'Ação de solicitação inválida'; end if;
  select * into v_request from public.spot_requests
  where id = p_request_id and condominium_id = p_condominium_id for update;
  if not found then raise exception 'Solicitação não encontrada neste condomínio'; end if;
  if v_request.status not in ('pending', 'waiting_list') then raise exception 'Esta solicitação já foi decidida'; end if;

  if p_action = 'convert_to_occurrence' then
    if v_request.request_type <> 'vaga' then raise exception 'Somente pedidos de vaga podem ser convertidos'; end if;
    update public.spot_requests
    set request_type = 'ocorrencia', severity = case when severity = 'normal' then 'attention' else severity end,
        decision_note = coalesce(nullif(btrim(p_note), ''), decision_note)
    where id = p_request_id returning * into v_request;
  elsif p_action = 'complete' then
    if v_request.request_type = 'vaga' then raise exception 'Pedidos de vaga precisam ser aprovados com uma atribuição'; end if;
    update public.spot_requests
    set status = 'approved', decision_note = nullif(btrim(p_note), ''), decided_at = now(), decided_by = auth.uid()
    where id = p_request_id returning * into v_request;
  else
    update public.spot_requests
    set status = 'rejected', decision_note = nullif(btrim(p_note), ''), decided_at = now(), decided_by = auth.uid()
    where id = p_request_id returning * into v_request;
  end if;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, entity_id, metadata)
  values (p_condominium_id, auth.uid(), 'operational_request_' || p_action, 'spot_request', p_request_id,
    jsonb_build_object('request_type', v_request.request_type, 'status', v_request.status, 'note', nullif(btrim(p_note), '')));
  return jsonb_build_object('request_id', v_request.id, 'status', v_request.status, 'request_type', v_request.request_type);
end;
$$;

-- A API autenticada lê as tabelas; toda mutação operacional passa pelas RPCs.
drop policy if exists "members access spots in their condominium" on public.bicycle_spots;
drop policy if exists "members access bicycles in their condominium" on public.bicycles;
drop policy if exists "members access allocations in their condominium" on public.allocations;
drop policy if exists "members access audit logs in their condominium" on public.audit_logs;
drop policy if exists "managers write spots in their condominium" on public.bicycle_spots;
drop policy if exists "managers write bicycles in their condominium" on public.bicycles;
drop policy if exists "managers write allocations in their condominium" on public.allocations;
drop policy if exists "managers write audit logs in their condominium" on public.audit_logs;
drop policy if exists "managers write their condominium snapshot" on public.condominium_snapshots;
drop policy if exists "managers manage spot requests in their condominium" on public.spot_requests;

drop policy if exists "members create spot requests in their condominium" on public.spot_requests;
drop policy if exists "members create pending spot requests in their condominium" on public.spot_requests;
create policy "members create pending spot requests in their condominium" on public.spot_requests
for insert to authenticated with check (
  public.can_access_condominium(condominium_id)
  and status = 'pending' and assigned_spot_id is null
  and decided_at is null and decided_by is null and bicycle_record_id is null
);

-- As versões antigas recebiam UUIDs internos e não devem ser chamadas pelo navegador.
revoke all on function public.assign_bicycle_to_spot(uuid, uuid, uuid, text, date, text) from authenticated;
revoke all on function public.release_spot_allocation(uuid, uuid, text) from authenticated;
revoke all on function public.upsert_bicycle_from_payload(uuid, jsonb) from public;
revoke all on function public.sync_snapshot_bicycles_from_payload(uuid, jsonb) from public;
revoke all on function public.sync_snapshot_bicycles_trigger() from public;

revoke all on function public.assign_bicycle_to_spot_by_legacy_id(uuid, text, jsonb, text, date, uuid, text) from public;
grant execute on function public.assign_bicycle_to_spot_by_legacy_id(uuid, text, jsonb, text, date, uuid, text) to authenticated;
revoke all on function public.release_spot_allocation_by_legacy_id(uuid, text, text) from public;
grant execute on function public.release_spot_allocation_by_legacy_id(uuid, text, text) to authenticated;
revoke all on function public.update_spot_concession_by_legacy_id(uuid, text, text, date) from public;
grant execute on function public.update_spot_concession_by_legacy_id(uuid, text, text, date) to authenticated;
revoke all on function public.register_spot_usage_by_legacy_id(uuid, text) from public;
grant execute on function public.register_spot_usage_by_legacy_id(uuid, text) to authenticated;
revoke all on function public.archive_bicycle_by_legacy_id(uuid, text, text) from public;
grant execute on function public.archive_bicycle_by_legacy_id(uuid, text, text) to authenticated;
revoke all on function public.decide_operational_request(uuid, uuid, text, text) from public;
grant execute on function public.decide_operational_request(uuid, uuid, text, text) to authenticated;
