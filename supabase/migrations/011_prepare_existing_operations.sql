-- Correção para condomínios que já possuíam vagas/bicicletas normalizadas
-- antes da importação do snapshot. Execute após 010.

create or replace function public.prepare_snapshot_transition(p_condominium_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payload jsonb;
  v_spots integer := 0;
  v_bikes integer := 0;
begin
  if auth.uid() is not null and not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para preparar este condomínio';
  end if;

  select payload into v_payload
  from public.condominium_snapshots
  where condominium_id = p_condominium_id;

  if v_payload is null then
    raise exception 'Nenhum snapshot encontrado para este condomínio';
  end if;

  update public.bicycle_spots db_spot
  set legacy_id = snapshot_spot.value ->> 'id'
  from jsonb_array_elements(coalesce(v_payload -> 'spots', '[]'::jsonb)) snapshot_spot
  where db_spot.condominium_id = p_condominium_id
    and db_spot.spot_number = snapshot_spot.value ->> 'spotNumber'
    and (db_spot.legacy_id is null or db_spot.legacy_id = snapshot_spot.value ->> 'id');
  get diagnostics v_spots = row_count;

  update public.bicycles db_bike
  set legacy_id = snapshot_bike.value ->> 'id'
  from jsonb_array_elements(coalesce(v_payload -> 'registeredBikes', '[]'::jsonb)) snapshot_bike
  where db_bike.condominium_id = p_condominium_id
    and nullif(db_bike.tag_number, '') is not null
    and db_bike.tag_number = nullif(snapshot_bike.value ->> 'tagNumber', '')
    and (db_bike.legacy_id is null or db_bike.legacy_id = snapshot_bike.value ->> 'id');
  get diagnostics v_bikes = row_count;

  return jsonb_build_object('existing_spots_matched', v_spots, 'existing_bikes_matched', v_bikes);
end;
$$;

revoke all on function public.prepare_snapshot_transition(uuid) from public;
grant execute on function public.prepare_snapshot_transition(uuid) to authenticated;
