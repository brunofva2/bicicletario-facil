-- Vincula cada solicitação à bicicleta real do catálogo, evitando correspondência por texto.
alter table public.spot_requests add column if not exists bicycle_id text;

create index if not exists spot_requests_bicycle_id_idx
  on public.spot_requests(condominium_id, bicycle_id);

create unique index if not exists one_open_request_per_bicycle_idx
  on public.spot_requests(condominium_id, bicycle_id)
  where bicycle_id is not null and status in ('pending', 'waiting_list');
