-- Sincronização offline-first para o snapshot do piloto.
-- Cada salvamento recebe uma versão. O banco rejeita alteração baseada em uma
-- versão antiga, evitando que um celular sobrescreva outro silenciosamente.

alter table public.condominium_snapshots
  add column if not exists version integer not null default 1;

create or replace function public.save_condominium_snapshot(
  p_condominium_id uuid,
  p_payload jsonb,
  p_expected_version integer default null
)
returns table (version integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_version integer;
begin
  if not public.can_manage_condominium(p_condominium_id) then
    raise exception 'Sem permissão para salvar este condomínio';
  end if;

  select s.version into v_current_version
  from public.condominium_snapshots s
  where s.condominium_id = p_condominium_id
  for update;

  if not found then
    if p_expected_version is not null then
      raise exception using
        errcode = '40001',
        message = 'CONFLITO_DE_SINCRONIZACAO: o snapshot foi alterado antes da criação local';
    end if;

    insert into public.condominium_snapshots (condominium_id, payload, version, updated_at, updated_by)
    values (p_condominium_id, p_payload, 1, now(), auth.uid());
    return query select 1, now();
    return;
  end if;

  if p_expected_version is distinct from v_current_version then
    raise exception using
      errcode = '40001',
      message = 'CONFLITO_DE_SINCRONIZACAO: existe uma versão mais recente na nuvem';
  end if;

  update public.condominium_snapshots
  set payload = p_payload,
      version = v_current_version + 1,
      updated_at = now(),
      updated_by = auth.uid()
  where condominium_id = p_condominium_id;

  return query select v_current_version + 1, now();
end;
$$;

revoke all on function public.save_condominium_snapshot(uuid, jsonb, integer) from public;
grant execute on function public.save_condominium_snapshot(uuid, jsonb, integer) to authenticated;
