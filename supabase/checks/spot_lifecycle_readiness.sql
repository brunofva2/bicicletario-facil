-- Diagnóstico somente de leitura antes de aposentar vagas de uma planta antiga
-- e normalizar a ligação técnica das vagas da planta atual com seus módulos.

with target as (
  select '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid as condominium_id
), snapshot as (
  select payload, version
  from public.condominium_snapshots
  where condominium_id = (select condominium_id from target)
), current_spots as (
  select
    spot ->> 'id' as legacy_id,
    spot ->> 'spotNumber' as spot_number,
    spot ->> 'sector' as sector,
    nullif(spot ->> 'floorPlanModuleId', '') as module_id
  from snapshot
  cross join lateral jsonb_array_elements(coalesce(payload -> 'spots', '[]'::jsonb)) spot
), configured_modules as (
  select
    module ->> 'id' as module_id,
    module ->> 'name' as module_name
  from snapshot
  cross join lateral jsonb_array_elements(coalesce(payload -> 'config' -> 'modules', '[]'::jsonb)) module
), module_matches as (
  select
    current_spot.legacy_id,
    count(configured_module.module_id) as matching_modules
  from current_spots current_spot
  left join configured_modules configured_module
    on configured_module.module_name = current_spot.sector
  group by current_spot.legacy_id
), database_spots as (
  select
    spot.id,
    spot.legacy_id,
    exists (
      select 1
      from current_spots current_spot
      where current_spot.legacy_id = spot.legacy_id
    ) as is_current,
    exists (
      select 1
      from public.allocations allocation
      where allocation.spot_id = spot.id
        and allocation.status = 'active'
    ) as has_active_allocation
  from public.bicycle_spots spot
  where spot.condominium_id = (select condominium_id from target)
)
select jsonb_build_object(
  'snapshot_version', (select version from snapshot),
  'current_snapshot_spots', (select count(*) from current_spots),
  'current_with_module_id', (select count(*) from current_spots where module_id is not null),
  'current_without_module_id', (select count(*) from current_spots where module_id is null),
  'without_module_but_exact_config_match', (
    select count(*)
    from current_spots current_spot
    join module_matches match on match.legacy_id = current_spot.legacy_id
    where current_spot.module_id is null
      and match.matching_modules = 1
  ),
  'without_module_and_no_exact_match', (
    select count(*)
    from current_spots current_spot
    join module_matches match on match.legacy_id = current_spot.legacy_id
    where current_spot.module_id is null
      and match.matching_modules = 0
  ),
  'without_module_and_ambiguous_match', (
    select count(*)
    from current_spots current_spot
    join module_matches match on match.legacy_id = current_spot.legacy_id
    where current_spot.module_id is null
      and match.matching_modules > 1
  ),
  'database_spots', (select count(*) from database_spots),
  'old_spots_not_in_current_snapshot', (select count(*) from database_spots where not is_current),
  'old_spots_with_active_allocation', (
    select count(*) from database_spots where not is_current and has_active_allocation
  ),
  'current_spots_with_active_allocation', (
    select count(*) from database_spots where is_current and has_active_allocation
  )
) as spot_lifecycle_readiness;
