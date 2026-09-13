-- Normaliza as 24 vagas-base legadas que pertencem aos módulos da planta.
-- Seguro para executar no SQL Editor: tudo acontece em uma transação e qualquer
-- divergência aborta antes de gravar. Não recria vagas, não altera QR, ocupação,
-- bicicleta ou histórico.

begin;

do $$
declare
  v_condominium_id constant uuid := '2c162f8b-0b31-40a1-b835-71e69a165f64';
  v_mapping constant jsonb := '[
    {"sector":"Setor A - Parede Norte","module_id":"bike_module-1789177481766"},
    {"sector":"Setor B - Parede Sul","module_id":"bike_module-1789177546912"},
    {"sector":"Setor C - Trilho Suspenso Leste","module_id":"bike_module-1789177259917"}
  ]'::jsonb;
  v_target_count integer;
  v_updated_count integer;
begin
  if not exists (
    select 1 from public.condominium_snapshots where condominium_id = v_condominium_id
  ) then
    raise exception 'Snapshot do condomínio não encontrado. Nenhuma vaga foi alterada.';
  end if;

  -- Os módulos precisam existir na planta salva. Isso impede vincular uma vaga
  -- a um ID digitado incorretamente ou a um módulo que foi removido da planta.
  if exists (
    select 1
    from jsonb_array_elements(v_mapping) mapping
    where not exists (
      select 1
      from public.condominium_snapshots snapshot
      cross join lateral jsonb_each(coalesce(snapshot.payload -> 'config' -> 'sectorFloorPlans', '{}'::jsonb)) plan
      cross join lateral jsonb_array_elements(coalesce(plan.value -> 'modules', '[]'::jsonb)) module
      where snapshot.condominium_id = v_condominium_id
        and module ->> 'id' = mapping ->> 'module_id'
    )
  ) then
    raise exception 'Um dos módulos esperados não existe na planta salva. Nenhuma vaga foi alterada.';
  end if;

  select count(*) into v_target_count
  from public.bicycle_spots spot
  join jsonb_array_elements(v_mapping) mapping
    on mapping ->> 'sector' = spot.sector
  where spot.condominium_id = v_condominium_id
    and spot.floor_plan_module_id is null;

  if v_target_count <> 24 then
    raise exception 'Foram encontradas % vagas legadas sem módulo; eram esperadas 24. Nenhuma vaga foi alterada.', v_target_count;
  end if;

  -- Simula a nova chave de localização e impede colisões com vagas já mapeadas.
  if exists (
    with mapping as (
      select mapping ->> 'sector' as sector, mapping ->> 'module_id' as module_id
      from jsonb_array_elements(v_mapping) mapping
    ), planned_locations as (
      select
        spot.spot_number,
        coalesce(mapping.module_id, spot.floor_plan_module_id, spot.location_key) as location_key
      from public.bicycle_spots spot
      left join mapping on mapping.sector = spot.sector and spot.floor_plan_module_id is null
      where spot.condominium_id = v_condominium_id
    )
    select 1
    from planned_locations
    group by location_key, spot_number
    having count(*) > 1
  ) then
    raise exception 'A vinculação criaria duas vagas com o mesmo número no mesmo módulo. Nenhuma vaga foi alterada.';
  end if;

  update public.bicycle_spots spot
  set floor_plan_module_id = mapping ->> 'module_id',
      location_key = mapping ->> 'module_id'
  from jsonb_array_elements(v_mapping) mapping
  where spot.condominium_id = v_condominium_id
    and spot.floor_plan_module_id is null
    and spot.sector = mapping ->> 'sector';

  get diagnostics v_updated_count = row_count;
  if v_updated_count <> 24 then
    raise exception 'Foram atualizadas % vagas; eram esperadas 24. A transação será cancelada.', v_updated_count;
  end if;

  -- O aplicativo lê o snapshot para montar os cartões. Atualizamos a mesma
  -- associação nele para que um próximo salvamento não volte a enviar null.
  update public.condominium_snapshots snapshot
  set payload = jsonb_set(
        snapshot.payload,
        '{spots}',
        (
          select jsonb_agg(
            case
              when mapping ->> 'module_id' is not null
                and nullif(spot.value ->> 'floorPlanModuleId', '') is null
              then spot.value || jsonb_build_object('floorPlanModuleId', mapping ->> 'module_id')
              else spot.value
            end
            order by spot.ordinality
          )
          from jsonb_array_elements(coalesce(snapshot.payload -> 'spots', '[]'::jsonb)) with ordinality as spot(value, ordinality)
          left join jsonb_array_elements(v_mapping) mapping
            on mapping ->> 'sector' = spot.value ->> 'sector'
        ),
        true
      ),
      version = snapshot.version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where snapshot.condominium_id = v_condominium_id;

  insert into public.audit_logs (condominium_id, actor_id, action, entity_type, metadata)
  values (
    v_condominium_id,
    auth.uid(),
    'legacy_spot_modules_normalized',
    'floor_plan',
    jsonb_build_object('updated_spots', v_updated_count, 'source', 'migration_015')
  );
end;
$$;

commit;

-- Confirmação final: deve retornar 58 vagas, todas com módulo.
select
  count(*) as total_vagas,
  count(*) filter (where floor_plan_module_id is not null) as vagas_com_modulo,
  count(*) filter (where floor_plan_module_id is null) as vagas_sem_modulo
from public.bicycle_spots
where condominium_id = '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid;
