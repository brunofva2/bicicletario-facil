-- Verificação somente de leitura após as migrações 009 a 019.
-- Não altera nenhum dado. Deve retornar uma única linha com todos os checks.

with
target as (
  select '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid as condominium_id
),
snapshot as (
  select s.payload, s.version
  from public.condominium_snapshots s
  join target t on t.condominium_id = s.condominium_id
),
spot_counts as (
  select
    count(*) as total,
    count(*) filter (where retired_at is null) as current_records,
    count(*) filter (where retired_at is not null) as retired,
    count(*) filter (where legacy_id is not null) as with_legacy_id,
    count(*) filter (where retired_at is null and floor_plan_module_id is not null) as current_with_module
  from public.bicycle_spots s
  join target t on t.condominium_id = s.condominium_id
),
bike_counts as (
  select
    count(*) as total,
    count(*) filter (where legacy_id like 'recovered-allocation:%') as recovered,
    count(*) filter (where legacy_id not like 'recovered-allocation:%') as catalog,
    count(*) filter (where archived_at is not null) as archived
  from public.bicycles b
  join target t on t.condominium_id = b.condominium_id
),
allocation_counts as (
  select count(*) filter (where status = 'active') as active
  from public.allocations a
  join target t on t.condominium_id = a.condominium_id
),
duplicate_locations as (
  select count(*) as total
  from (
    select s.location_key, s.spot_number
    from public.bicycle_spots s
    join target t on t.condominium_id = s.condominium_id
    where s.retired_at is null
    group by s.location_key, s.spot_number
    having count(*) > 1
  ) duplicates
),
duplicate_active_spots as (
  select count(*) as total
  from (
    select a.spot_id
    from public.allocations a
    join target t on t.condominium_id = a.condominium_id
    where a.status = 'active'
    group by a.spot_id
    having count(*) > 1
  ) duplicates
),
duplicate_active_bikes as (
  select count(*) as total
  from (
    select a.bicycle_id
    from public.allocations a
    join target t on t.condominium_id = a.condominium_id
    where a.status = 'active'
    group by a.bicycle_id
    having count(*) > 1
  ) duplicates
),
cross_condominium_links as (
  select count(*) as total
  from public.allocations a
  join public.bicycle_spots s on s.id = a.spot_id
  join public.bicycles b on b.id = a.bicycle_id
  join target t on t.condominium_id = a.condominium_id
  where s.condominium_id <> a.condominium_id
     or b.condominium_id <> a.condominium_id
),
retired_active_allocations as (
  select count(*) as total
  from public.allocations allocation
  join public.bicycle_spots spot on spot.id = allocation.spot_id
  join target t on t.condominium_id = allocation.condominium_id
  where allocation.status = 'active'
    and spot.retired_at is not null
),
functions as (
  select count(*) filter (where routine_name = 'assign_bicycle_to_spot_by_legacy_id') as assign_exists,
         count(*) filter (where routine_name = 'release_spot_allocation_by_legacy_id') as release_exists,
         count(*) filter (where routine_name = 'update_spot_concession_by_legacy_id') as concession_exists,
         count(*) filter (where routine_name = 'register_spot_usage_by_legacy_id') as usage_exists,
         count(*) filter (where routine_name = 'archive_bicycle_by_legacy_id') as archive_exists,
         count(*) filter (where routine_name = 'decide_operational_request') as request_decision_exists,
         count(*) filter (where routine_name = 'save_condominium_snapshot') as offline_sync_exists,
         count(*) filter (where routine_name = 'sync_snapshot_spots_from_payload') as plant_sync_exists,
         count(*) filter (where routine_name = 'sync_snapshot_bicycles_from_payload') as bike_sync_exists,
         count(*) filter (where routine_name = 'get_spot_public_slug') as public_qr_slug_exists,
         count(*) filter (where routine_name = 'get_public_spot') as public_spot_lookup_exists
  from information_schema.routines
  where routine_schema = 'public'
),
unexpected_direct_write_policies as (
  select count(*) as total
  from pg_policies
  where schemaname = 'public'
    and tablename in ('bicycle_spots', 'bicycles', 'allocations', 'audit_logs', 'condominium_snapshots', 'spot_requests')
    and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE')
    and not (tablename = 'spot_requests' and policyname = 'members create pending spot requests in their condominium')
)
select jsonb_build_object(
  'snapshot_version', (select version from snapshot),
  'spots', (select row_to_json(spot_counts) from spot_counts),
  'bicycles', (select row_to_json(bike_counts) from bike_counts),
  'active_allocations', (select active from allocation_counts),
  'duplicate_location_references', (select total from duplicate_locations),
  'duplicate_active_spots', (select total from duplicate_active_spots),
  'duplicate_active_bicycles', (select total from duplicate_active_bikes),
  'cross_condominium_links', (select total from cross_condominium_links),
  'retired_active_allocations', (select total from retired_active_allocations),
  'unexpected_direct_write_policies', (select total from unexpected_direct_write_policies),
  'functions', (select row_to_json(functions) from functions)
) as backend_integrity;
