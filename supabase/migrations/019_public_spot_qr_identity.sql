-- Consulta pública por UUID estável. O número visível não identifica uma vaga,
-- pois pode se repetir em módulos físicos diferentes.

create or replace function public.get_spot_public_slug(
  p_condominium_id uuid,
  p_spot_legacy_id text
)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_slug uuid;
begin
  if not public.can_access_condominium(p_condominium_id) then
    raise exception 'Sem permissão para gerar a identificação pública desta vaga';
  end if;
  select spot.public_slug into v_slug
  from public.bicycle_spots spot
  where spot.condominium_id = p_condominium_id
    and spot.legacy_id = p_spot_legacy_id
    and spot.retired_at is null;
  if v_slug is null then raise exception 'Vaga atual não encontrada'; end if;
  return v_slug;
end;
$$;

-- Reafirma que a consulta anônima só retorna identificação física e dados
-- visuais da bicicleta. Nome, unidade, telefone, e-mail e chassi não saem daqui.
create or replace function public.get_public_spot(p_slug uuid)
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
  select condominium.name, spot.spot_number, spot.sector, spot.hook_type,
    case when allocation.id is null then 'livre' else 'ocupada' end,
    bicycle.photo_url, bicycle.brand_model, bicycle.color, bicycle.tag_number
  from public.bicycle_spots spot
  join public.condominiums condominium on condominium.id = spot.condominium_id
  left join public.allocations allocation on allocation.spot_id = spot.id and allocation.status = 'active'
  left join public.bicycles bicycle on bicycle.id = allocation.bicycle_id and bicycle.archived_at is null
  where spot.public_slug = p_slug
    and spot.retired_at is null;
$$;

revoke all on function public.get_spot_public_slug(uuid, text) from public;
grant execute on function public.get_spot_public_slug(uuid, text) to authenticated;
revoke all on function public.get_public_spot(uuid) from public;
grant execute on function public.get_public_spot(uuid) to anon, authenticated;
