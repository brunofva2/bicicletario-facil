-- Diagnóstico somente de leitura para vagas que não trouxeram floorPlanModuleId.
-- Não altera dados. Ajuda a decidir se a normalização é necessária.

with target as (
  select '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid as condominium_id
)
select
  coalesce(s.sector, 'Setor não informado') as setor,
  coalesce(s.location_key, 'Chave não informada') as chave_de_localizacao,
  count(*) as quantidade,
  array_agg(s.spot_number order by s.spot_number) as vagas
from public.bicycle_spots s
join target t on t.condominium_id = s.condominium_id
where s.floor_plan_module_id is null
group by s.sector, s.location_key
order by s.sector, s.location_key;

-- Amostra individual para conferir origem e permitir comparação com a planta.
with target as (
  select '2c162f8b-0b31-40a1-b835-71e69a165f64'::uuid as condominium_id
)
select
  s.legacy_id as id_antigo,
  s.spot_number as vaga,
  s.sector as setor,
  s.location_key as chave_de_localizacao,
  s.floor_plan_module_id as modulo_da_planta
from public.bicycle_spots s
join target t on t.condominium_id = s.condominium_id
where s.floor_plan_module_id is null
order by s.sector, s.spot_number;
