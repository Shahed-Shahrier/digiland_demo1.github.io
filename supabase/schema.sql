-- Run this in Supabase SQL Editor before deploying the GitHub Pages build.
-- This demo stores each app entity as JSONB so the static frontend can persist
-- data directly through Supabase's browser-safe anon API.

create table if not exists public.digiland_users (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.digiland_land_records (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.digiland_applications (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.digiland_notifications (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.digiland_audit_logs (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_digiland_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists digiland_users_updated_at on public.digiland_users;
create trigger digiland_users_updated_at
before update on public.digiland_users
for each row execute function public.set_digiland_updated_at();

drop trigger if exists digiland_land_records_updated_at on public.digiland_land_records;
create trigger digiland_land_records_updated_at
before update on public.digiland_land_records
for each row execute function public.set_digiland_updated_at();

drop trigger if exists digiland_applications_updated_at on public.digiland_applications;
create trigger digiland_applications_updated_at
before update on public.digiland_applications
for each row execute function public.set_digiland_updated_at();

drop trigger if exists digiland_notifications_updated_at on public.digiland_notifications;
create trigger digiland_notifications_updated_at
before update on public.digiland_notifications
for each row execute function public.set_digiland_updated_at();

drop trigger if exists digiland_audit_logs_updated_at on public.digiland_audit_logs;
create trigger digiland_audit_logs_updated_at
before update on public.digiland_audit_logs
for each row execute function public.set_digiland_updated_at();

alter table public.digiland_users enable row level security;
alter table public.digiland_land_records enable row level security;
alter table public.digiland_applications enable row level security;
alter table public.digiland_notifications enable row level security;
alter table public.digiland_audit_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.digiland_users to anon, authenticated;
grant select, insert, update, delete on public.digiland_land_records to anon, authenticated;
grant select, insert, update, delete on public.digiland_applications to anon, authenticated;
grant select, insert, update, delete on public.digiland_notifications to anon, authenticated;
grant select, insert, update, delete on public.digiland_audit_logs to anon, authenticated;

drop policy if exists "Public demo read users" on public.digiland_users;
create policy "Public demo read users" on public.digiland_users for select using (true);
drop policy if exists "Public demo write users" on public.digiland_users;
create policy "Public demo write users" on public.digiland_users for all using (true) with check (true);

drop policy if exists "Public demo read land records" on public.digiland_land_records;
create policy "Public demo read land records" on public.digiland_land_records for select using (true);
drop policy if exists "Public demo write land records" on public.digiland_land_records;
create policy "Public demo write land records" on public.digiland_land_records for all using (true) with check (true);

drop policy if exists "Public demo read applications" on public.digiland_applications;
create policy "Public demo read applications" on public.digiland_applications for select using (true);
drop policy if exists "Public demo write applications" on public.digiland_applications;
create policy "Public demo write applications" on public.digiland_applications for all using (true) with check (true);

drop policy if exists "Public demo read notifications" on public.digiland_notifications;
create policy "Public demo read notifications" on public.digiland_notifications for select using (true);
drop policy if exists "Public demo write notifications" on public.digiland_notifications;
create policy "Public demo write notifications" on public.digiland_notifications for all using (true) with check (true);

drop policy if exists "Public demo read audit logs" on public.digiland_audit_logs;
create policy "Public demo read audit logs" on public.digiland_audit_logs for select using (true);
drop policy if exists "Public demo write audit logs" on public.digiland_audit_logs;
create policy "Public demo write audit logs" on public.digiland_audit_logs for all using (true) with check (true);
