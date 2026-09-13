-- Amplia a antiga fila de vagas para uma central de registros operacionais.
-- Pedidos de vaga continuam usando o mesmo fluxo de aprovação e atribuição.
alter table public.spot_requests
  add column if not exists request_type text not null default 'vaga'
    check (request_type in ('vaga', 'ocorrencia', 'vistoria', 'regularizacao')),
  add column if not exists severity text not null default 'normal'
    check (severity in ('normal', 'attention', 'urgent'));

create index if not exists spot_requests_condominium_type_status_idx
  on public.spot_requests(condominium_id, request_type, status, created_at);

-- A regra de unicidade deve valer apenas para pedidos de vaga ainda abertos.
drop index if exists public.one_open_request_per_bicycle_idx;
create unique index one_open_spot_request_per_bicycle_idx
  on public.spot_requests(condominium_id, bicycle_id)
  where bicycle_id is not null
    and request_type = 'vaga'
    and status in ('pending', 'waiting_list');
