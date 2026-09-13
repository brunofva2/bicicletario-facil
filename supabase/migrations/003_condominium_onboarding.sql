-- Nobrutec onboarding fields for condominium portfolio management.
-- An administrator may keep a default condominium for testing while retaining portfolio-wide access.
alter table public.profiles drop constraint if exists staff_requires_condominium;
alter table public.profiles add constraint profile_role_assignment check (
  (role = 'staff' and condominium_id is not null) or role <> 'staff'
);

alter table public.condominiums
  add column if not exists block_count integer not null default 1 check (block_count > 0),
  add column if not exists apartment_count integer not null default 1 check (apartment_count > 0),
  add column if not exists status text not null default 'active' check (status in ('active', 'pilot', 'inactive'));

update public.condominiums
set block_count = 3,
    apartment_count = 250,
    status = 'pilot'
where code = 'DEMO-HORIZONTE-250';
