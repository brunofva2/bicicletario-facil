-- Run this migration because the initial schema may already be installed.
-- Portaria/zelador can read only. Síndico and Nobrutec can manage their own data.

create or replace function public.can_manage_condominium(target_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_nobrutec_admin() or exists (
    select 1 from public.profiles
    where id = auth.uid() and condominium_id = target_id and role = 'syndic'
  );
$$;

drop policy if exists "members access spots in their condominium" on public.bicycle_spots;
drop policy if exists "members access bicycles in their condominium" on public.bicycles;
drop policy if exists "members access allocations in their condominium" on public.allocations;
drop policy if exists "members access audit logs in their condominium" on public.audit_logs;

create policy "members read spots in their condominium" on public.bicycle_spots
for select to authenticated using (public.can_access_condominium(condominium_id));
create policy "managers write spots in their condominium" on public.bicycle_spots
for all to authenticated using (public.can_manage_condominium(condominium_id)) with check (public.can_manage_condominium(condominium_id));

create policy "members read bicycles in their condominium" on public.bicycles
for select to authenticated using (public.can_access_condominium(condominium_id));
create policy "managers write bicycles in their condominium" on public.bicycles
for all to authenticated using (public.can_manage_condominium(condominium_id)) with check (public.can_manage_condominium(condominium_id));

create policy "members read allocations in their condominium" on public.allocations
for select to authenticated using (public.can_access_condominium(condominium_id));
create policy "managers write allocations in their condominium" on public.allocations
for all to authenticated using (public.can_manage_condominium(condominium_id)) with check (public.can_manage_condominium(condominium_id));

create policy "members read audit logs in their condominium" on public.audit_logs
for select to authenticated using (public.can_access_condominium(condominium_id));
create policy "managers write audit logs in their condominium" on public.audit_logs
for insert to authenticated with check (public.can_manage_condominium(condominium_id));
