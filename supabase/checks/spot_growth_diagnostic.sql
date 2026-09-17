-- Diagnóstico somente de leitura para descobrir por que a tabela possui mais
-- vagas do que a planta/snapshot atual. Não altera nenhum dado.

with target as (
  select '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid as condominium_id
), snapshot as (
  select payload, version
  from public.condominium_snapshots
  where condominium_id = (select condominium_id from target)
), current_snapshot_spots as (
  select spot ->> 'id' as legacy_id,
         spot ->> 'spotNumber' as spot_number,
         spot ->> 'sector' as sector,
         nullif(spot ->> 'floorPlanModuleId', '') as module_id
  from snapshot
  cross join lateral jsonb_array_elements(coalesce(payload -> 'spots', '[]'::jsonb)) spot
), database_spots as (
  select spot.*,
         exists (
           select 1 from current_snapshot_spots current
           where current.legacy_id = spot.legacy_id
         ) as exists_in_current_snapshot,
         exists (
           select 1 from public.allocations allocation
           where allocation.spot_id = spot.id and allocation.status = 'active'
         ) as has_active_allocation
  from public.bicycle_spots spot
  where spot.condominium_id = (select condominium_id from target)
)
select jsonb_build_object(
  'snapshot_version', (select version from snapshot),
  'snapshot_spots', (select count(*) from current_snapshot_spots),
  'snapshot_spots_with_module', (select count(*) from current_snapshot_spots where module_id is not null),
  'database_spots', (select count(*) from database_spots),
  'database_spots_current', (select count(*) from database_spots where exists_in_current_snapshot),
  'database_spots_not_in_snapshot', (select count(*) from database_spots where not exists_in_current_snapshot),
  'stale_spots_with_active_allocation', (select count(*) from database_spots where not exists_in_current_snapshot and has_active_allocation),
  'current_spots_missing_from_database', (
    select count(*) from current_snapshot_spots current
    where not exists (select 1 from database_spots db where db.legacy_id = current.legacy_id)
  ),
  'snapshot_duplicate_ids', (
    select count(*) from (
      select legacy_id from current_snapshot_spots group by legacy_id having count(*) > 1
    ) duplicates
  )
) as spot_growth_summary;

select
  spot.sector,
  count(*) as total_no_banco,
  count(*) filter (where spot.floor_plan_module_id is not null) as com_modulo,
  count(*) filter (where current.legacy_id is not null) as presentes_no_snapshot,
  count(*) filter (where current.legacy_id is null) as ausentes_do_snapshot,
  min(spot.created_at) as primeiro_registro,
  max(spot.created_at) as ultimo_registro
from public.bicycle_spots spot
left join (
  select item ->> 'id' as legacy_id
  from public.condominium_snapshots snapshot
  cross join lateral jsonb_array_elements(coalesce(snapshot.payload -> 'spots', '[]'::jsonb)) item
  where snapshot.condominium_id = '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid
) current on current.legacy_id = spot.legacy_id
where spot.condominium_id = '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid
group by spot.sector
order by total_no_banco desc, spot.sector;
