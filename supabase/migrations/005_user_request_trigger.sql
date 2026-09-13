-- Step 2 of user onboarding. Run after 004_user_onboarding.sql succeeds.
alter table public.profiles add column if not exists email text unique;

update public.profiles p set email = u.email from auth.users u where p.id = u.id and p.email is null;

alter table public.profiles alter column full_name drop not null;
alter table public.profiles alter column role set default 'pending';
alter table public.profiles drop constraint if exists profile_role_assignment;
alter table public.profiles add constraint profile_role_assignment check (
  (role in ('staff', 'syndic') and condominium_id is not null) or role in ('nobrutec_admin', 'pending')
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)), new.email, 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
