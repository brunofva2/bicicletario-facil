-- Mantém funcionais as placas emitidas no piloto antes do UUID público.
-- A função retorna somente os mesmos campos não pessoais da consulta nova e
-- recusa identificadores que correspondam a mais de uma vaga atual.

create or replace function public.get_public_spot_legacy(p_identifier text)
returns table (
  condominium_name text,
  spot_number text,
  sector text,
  hook_type text,
  status text,
  bike_photo_url text,
  bike_model text,
  bike_color text,
  bike_tag text
)
language sql
stable
security definer
set search_path = public
as $$
  with candidates as (
    select spot.id
    from public.bicycle_spots spot
    where spot.retired_at is null
      and (
        spot.legacy_id = nullif(btrim(p_identifier), '')
        or spot.qr_code_value = nullif(btrim(p_identifier), '')
        or lower(spot.spot_number) = lower(nullif(btrim(p_identifier), ''))
      )
  ), unique_candidate as (
    select candidate.id
    from candidates candidate
    where (select count(*) from candidates) = 1
  )
  select condominium.name, spot.spot_number, spot.sector, spot.hook_type,
    case when allocation.id is null then 'livre' else 'ocupada' end,
    bicycle.photo_url, bicycle.brand_model, bicycle.color, bicycle.tag_number
  from unique_candidate candidate
  join public.bicycle_spots spot on spot.id = candidate.id
  join public.condominiums condominium on condominium.id = spot.condominium_id
  left join public.allocations allocation on allocation.spot_id = spot.id and allocation.status = 'active'
  left join public.bicycles bicycle on bicycle.id = allocation.bicycle_id and bicycle.archived_at is null;
$$;

revoke all on function public.get_public_spot_legacy(text) from public;
grant execute on function public.get_public_spot_legacy(text) to anon, authenticated;
