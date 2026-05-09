-- Digi-Land RLS policy draft for Supabase project ozrbinmqhtbpqoehotjc.
-- REVIEW BEFORE PRODUCTION. This is a demo-ready draft, not a substitute for
-- a production authorization review.
--
-- Live role names expected in public.roles:
-- applicant, reviewer, survey_officer, admin, super_admin
--
-- public.users.auth_user_id is expected to exist and reference auth.users(id).
-- Browser code must use only publishable/anon keys. Never use service_role here.

alter table public.users
add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

revoke execute on function public.rls_auto_enable() from anon, authenticated;

create schema if not exists private;

create or replace function private.normalize_app_role(role_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(replace(replace(coalesce(role_name, ''), '-', '_'), ' ', '_'))
$$;

create or replace function private.current_app_user_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select u.user_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.deleted_at is null
  limit 1
$$;

create or replace function private.has_app_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.role_id = ur.role_id
    where ur.user_id = private.current_app_user_id()
      and private.normalize_app_role(r.role_name) = private.normalize_app_role(role_name)
  )
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select private.has_app_role('admin') or private.has_app_role('super_admin') $$;

create or replace function private.is_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select private.has_app_role('reviewer') or private.has_app_role('land_officer') $$;

create or replace function private.is_applicant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select private.has_app_role('applicant') or private.has_app_role('citizen') $$;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.current_app_user_id() to authenticated;
grant execute on function private.has_app_role(text) to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_reviewer() to authenticated;
grant execute on function private.is_applicant() to authenticated;

alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.addresses enable row level security;
alter table public.land_parcels enable row level security;
alter table public.land_owners enable row level security;
alter table public.user_land_records enable row level security;
alter table public.applications enable row level security;
alter table public.application_new_owners enable row level security;
alter table public.documents enable row level security;
alter table public.verifications enable row level security;
alter table public.reviews enable row level security;
alter table public.clarifications enable row level security;
alter table public.decisions enable row level security;
alter table public.application_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Users read own profile or admin" on public.users;
drop policy if exists "Users update own profile or admin" on public.users;
drop policy if exists "Users create own profile" on public.users;
drop policy if exists "Admins manage users" on public.users;
drop policy if exists "Authenticated users read roles" on public.roles;
drop policy if exists "Users read own roles or admin" on public.user_roles;
drop policy if exists "Users assign applicant role to self" on public.user_roles;
drop policy if exists "Admins manage user roles" on public.user_roles;
drop policy if exists "Admins read permissions" on public.permissions;
drop policy if exists "Admins manage role permissions" on public.role_permissions;
drop policy if exists "Users read own addresses or staff" on public.addresses;
drop policy if exists "Users manage own addresses" on public.addresses;
drop policy if exists "Users read own land records or staff" on public.user_land_records;
drop policy if exists "Staff manage user land records" on public.user_land_records;
drop policy if exists "Users read relevant land owners" on public.land_owners;
drop policy if exists "Staff manage land owners" on public.land_owners;
drop policy if exists "Users read relevant land parcels" on public.land_parcels;
drop policy if exists "Staff manage land parcels" on public.land_parcels;
drop policy if exists "Users read relevant applications" on public.applications;
drop policy if exists "Applicants create own applications" on public.applications;
drop policy if exists "Staff update relevant applications" on public.applications;
drop policy if exists "Users read relevant new owners" on public.application_new_owners;
drop policy if exists "Applicants add new owners to own applications" on public.application_new_owners;
drop policy if exists "Users read relevant documents" on public.documents;
drop policy if exists "Users insert own document metadata" on public.documents;
drop policy if exists "Staff update document review fields" on public.documents;
drop policy if exists "Users read relevant reviews" on public.reviews;
drop policy if exists "Reviewers add reviews" on public.reviews;
drop policy if exists "Users read relevant clarifications" on public.clarifications;
drop policy if exists "Reviewers request clarifications" on public.clarifications;
drop policy if exists "Users read relevant decisions" on public.decisions;
drop policy if exists "Admins and reviewers add decisions" on public.decisions;
drop policy if exists "Survey officers read assigned verifications" on public.verifications;
drop policy if exists "Survey officers insert verifications" on public.verifications;
drop policy if exists "Survey officers update own verifications" on public.verifications;
drop policy if exists "Users read relevant status history" on public.application_status_history;
drop policy if exists "Staff insert status history" on public.application_status_history;
drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users mark own notifications read" on public.notifications;
drop policy if exists "Staff insert notifications" on public.notifications;
drop policy if exists "Admins read audit logs" on public.audit_logs;
drop policy if exists "Temporary authenticated audit inserts" on public.audit_logs;
drop policy if exists "Admins manage system settings" on public.system_settings;
drop policy if exists "Users read own payments or admin" on public.payments;

create policy "Users read own profile or admin" on public.users
for select to authenticated
using (auth_user_id = auth.uid() or private.is_admin());

create policy "Users update own profile or admin" on public.users
for update to authenticated
using (auth_user_id = auth.uid() or private.is_admin())
with check (auth_user_id = auth.uid() or private.is_admin());

create policy "Users create own profile" on public.users
for insert to authenticated
with check (auth_user_id = auth.uid());

create policy "Admins manage users" on public.users
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Authenticated users read roles" on public.roles
for select to authenticated
using (true);

create policy "Users read own roles or admin" on public.user_roles
for select to authenticated
using (user_id = private.current_app_user_id() or private.is_admin());

create policy "Users assign applicant role to self" on public.user_roles
for insert to authenticated
with check (
  user_id = private.current_app_user_id()
  and exists (
    select 1
    from public.roles r
    where r.role_id = user_roles.role_id
      and private.normalize_app_role(r.role_name) = 'applicant'
  )
);

create policy "Admins manage user roles" on public.user_roles
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Admins read permissions" on public.permissions
for select to authenticated
using (private.is_admin());

create policy "Admins manage role permissions" on public.role_permissions
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Users read own addresses or staff" on public.addresses
for select to authenticated
using (user_id = private.current_app_user_id() or private.is_admin() or private.is_reviewer());

create policy "Users manage own addresses" on public.addresses
for all to authenticated
using (user_id = private.current_app_user_id())
with check (user_id = private.current_app_user_id());

create policy "Users read own land records or staff" on public.user_land_records
for select to authenticated
using (user_id = private.current_app_user_id() or private.is_admin() or private.is_reviewer());

create policy "Staff manage user land records" on public.user_land_records
for all to authenticated
using (private.is_admin() or private.is_reviewer())
with check (private.is_admin() or private.is_reviewer());

create policy "Users read relevant land owners" on public.land_owners
for select to authenticated
using (
  user_id = private.current_app_user_id()
  or private.is_admin()
  or private.is_reviewer()
  or private.has_app_role('survey_officer')
);

create policy "Staff manage land owners" on public.land_owners
for all to authenticated
using (private.is_admin() or private.is_reviewer())
with check (private.is_admin() or private.is_reviewer());

create policy "Users read relevant land parcels" on public.land_parcels
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or exists (
    select 1 from public.user_land_records ulr
    where ulr.land_id = land_parcels.land_id
      and ulr.user_id = private.current_app_user_id()
  )
  or exists (
    select 1 from public.applications a
    where a.land_id = land_parcels.land_id
      and (a.applicant_user_id = private.current_app_user_id()
        or a.assigned_survey_officer_id = private.current_app_user_id())
  )
);

create policy "Staff manage land parcels" on public.land_parcels
for all to authenticated
using (private.is_admin() or private.is_reviewer())
with check (private.is_admin() or private.is_reviewer());

create policy "Users read relevant applications" on public.applications
for select to authenticated
using (
  applicant_user_id = private.current_app_user_id()
  or assigned_admin_id = private.current_app_user_id()
  or assigned_survey_officer_id = private.current_app_user_id()
  or private.is_admin()
  or private.is_reviewer()
);

create policy "Applicants create own applications" on public.applications
for insert to authenticated
with check (applicant_user_id = private.current_app_user_id() and private.is_applicant());

create policy "Staff update relevant applications" on public.applications
for update to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or assigned_survey_officer_id = private.current_app_user_id()
)
with check (
  private.is_admin()
  or private.is_reviewer()
  or assigned_survey_officer_id = private.current_app_user_id()
);

create policy "Users read relevant new owners" on public.application_new_owners
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or exists (
    select 1 from public.applications a
    where a.application_id = application_new_owners.application_id
      and (a.applicant_user_id = private.current_app_user_id()
        or a.assigned_admin_id = private.current_app_user_id()
        or a.assigned_survey_officer_id = private.current_app_user_id())
  )
);

create policy "Applicants add new owners to own applications" on public.application_new_owners
for insert to authenticated
with check (
  exists (
    select 1 from public.applications a
    where a.application_id = application_new_owners.application_id
      and a.applicant_user_id = private.current_app_user_id()
  )
);

create policy "Users read relevant documents" on public.documents
for select to authenticated
using (
  user_id = private.current_app_user_id()
  or private.is_admin()
  or private.is_reviewer()
  or exists (
    select 1 from public.applications a
    where a.application_id = documents.application_id
      and (a.applicant_user_id = private.current_app_user_id()
        or a.assigned_survey_officer_id = private.current_app_user_id())
  )
);

create policy "Users insert own document metadata" on public.documents
for insert to authenticated
with check (user_id = private.current_app_user_id());

create policy "Staff update document review fields" on public.documents
for update to authenticated
using (private.is_admin() or private.is_reviewer())
with check (private.is_admin() or private.is_reviewer());

create policy "Users read relevant reviews" on public.reviews
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or reviewer_id = private.current_app_user_id()
  or exists (
    select 1 from public.applications a
    where a.application_id = reviews.application_id
      and a.applicant_user_id = private.current_app_user_id()
  )
);

create policy "Reviewers add reviews" on public.reviews
for insert to authenticated
with check (reviewer_id = private.current_app_user_id() and (private.is_admin() or private.is_reviewer()));

create policy "Users read relevant clarifications" on public.clarifications
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or exists (
    select 1 from public.applications a
    where a.application_id = clarifications.application_id
      and a.applicant_user_id = private.current_app_user_id()
  )
);

create policy "Reviewers request clarifications" on public.clarifications
for insert to authenticated
with check (private.is_admin() or private.is_reviewer());

create policy "Users read relevant decisions" on public.decisions
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or exists (
    select 1 from public.applications a
    where a.application_id = decisions.application_id
      and a.applicant_user_id = private.current_app_user_id()
  )
);

create policy "Admins and reviewers add decisions" on public.decisions
for insert to authenticated
with check (private.is_admin() or private.is_reviewer());

create policy "Survey officers read assigned verifications" on public.verifications
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or survey_officer_id = private.current_app_user_id()
);

create policy "Survey officers insert verifications" on public.verifications
for insert to authenticated
with check (survey_officer_id = private.current_app_user_id() and private.has_app_role('survey_officer'));

create policy "Survey officers update own verifications" on public.verifications
for update to authenticated
using (survey_officer_id = private.current_app_user_id() or private.is_admin())
with check (survey_officer_id = private.current_app_user_id() or private.is_admin());

create policy "Users read relevant status history" on public.application_status_history
for select to authenticated
using (
  private.is_admin()
  or private.is_reviewer()
  or exists (
    select 1 from public.applications a
    where a.application_id = application_status_history.application_id
      and (a.applicant_user_id = private.current_app_user_id()
        or a.assigned_survey_officer_id = private.current_app_user_id())
  )
);

create policy "Staff insert status history" on public.application_status_history
for insert to authenticated
with check (private.is_admin() or private.is_reviewer() or private.has_app_role('survey_officer'));

create policy "Users read own notifications" on public.notifications
for select to authenticated
using (recipient_user_id = private.current_app_user_id() or private.is_admin());

create policy "Users mark own notifications read" on public.notifications
for update to authenticated
using (recipient_user_id = private.current_app_user_id() or private.is_admin())
with check (recipient_user_id = private.current_app_user_id() or private.is_admin());

create policy "Staff insert notifications" on public.notifications
for insert to authenticated
with check (private.is_admin() or private.is_reviewer() or private.has_app_role('survey_officer'));

create policy "Admins read audit logs" on public.audit_logs
for select to authenticated
using (private.is_admin());

-- Demo only: browser audit inserts are not trustworthy for production.
-- Move this to DB triggers, Edge Functions, or trusted RPC before production.
create policy "Temporary authenticated audit inserts" on public.audit_logs
for insert to authenticated
with check (actor_user_id = private.current_app_user_id());

create policy "Admins manage system settings" on public.system_settings
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

create policy "Users read own payments or admin" on public.payments
for select to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.applications a
    where a.application_id = payments.application_id
      and a.applicant_user_id = private.current_app_user_id()
  )
);
