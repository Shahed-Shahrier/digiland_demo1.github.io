-- Fix admin/reviewer write access for land ownership linking tables.
-- Apply in Supabase SQL Editor before testing admin land record creation.

alter table public.land_owners enable row level security;
alter table public.user_land_records enable row level security;

drop policy if exists "Citizens read own land records" on public.user_land_records;
drop policy if exists "Users read own land records or staff" on public.user_land_records;
drop policy if exists "Staff manage user land records" on public.user_land_records;
drop policy if exists "Officers and admins read land owners" on public.land_owners;
drop policy if exists "Users read relevant land owners" on public.land_owners;
drop policy if exists "Staff manage land owners" on public.land_owners;

create policy "users and officers can read user land records" on public.user_land_records
for select to authenticated
using (
  user_id = public.current_app_user_id()
  or public.has_app_role('admin')
  or public.has_app_role('super_admin')
  or public.has_app_role('survey_officer')
  or public.has_app_role('reviewer')
);

create policy "Staff manage user land records" on public.user_land_records
for all to authenticated
using (
  public.has_app_role('admin')
  or public.has_app_role('super_admin')
  or public.has_app_role('reviewer')
)
with check (
  public.has_app_role('admin')
  or public.has_app_role('super_admin')
  or public.has_app_role('reviewer')
);

create policy "users and officers can read land owners" on public.land_owners
for select to authenticated
using (
  user_id = public.current_app_user_id()
  or public.has_app_role('admin')
  or public.has_app_role('super_admin')
  or public.has_app_role('survey_officer')
  or public.has_app_role('reviewer')
);

create policy "Staff manage land owners" on public.land_owners
for all to authenticated
using (
  public.has_app_role('admin')
  or public.has_app_role('super_admin')
  or public.has_app_role('reviewer')
)
with check (
  public.has_app_role('admin')
  or public.has_app_role('super_admin')
  or public.has_app_role('reviewer')
);
