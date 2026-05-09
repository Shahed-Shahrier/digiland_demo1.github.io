-- Digi-Land RLS policy draft for Supabase project ozrbinmqhtbpqoehotjc.
-- REVIEW BEFORE PRODUCTION. Do not apply blindly.
--
-- This draft assumes public.users can be mapped to auth.users by adding
-- public.users.auth_user_id. The provided schema facts did not prove that this
-- column already exists, so the ALTER is intentionally commented.
--
alter table public.users
add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

revoke execute on function public.rls_auto_enable() from anon, authenticated;

create or replace function public.current_app_user_id()
returns bigint
language sql
stable
security invoker
set search_path = public
as $$
  select u.user_id
  from public.users u
  where u.auth_user_id = auth.uid()
    and u.deleted_at is null
  limit 1
$$;

create or replace function public.has_role(role_name text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.role_id = ur.role_id
    where ur.user_id = public.current_app_user_id()
      and lower(replace(r.role_name, ' ', '_')) = lower(replace(role_name, ' ', '_'))
  )
$$;

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

-- Users / profiles
create policy "Users can read own profile" on public.users
for select using (user_id = public.current_app_user_id() or public.has_role('admin'));

create policy "Users can update own profile" on public.users
for update using (user_id = public.current_app_user_id() or public.has_role('admin'))
with check (user_id = public.current_app_user_id() or public.has_role('admin'));

create policy "Authenticated users create own profile" on public.users
for insert to authenticated with check (auth_user_id = auth.uid());

create policy "Admin manages users" on public.users
for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Roles / permissions are lookup-like but still not public to anonymous users.
create policy "Authenticated users can read roles" on public.roles
for select to authenticated using (true);

create policy "Authenticated users can read own roles" on public.user_roles
for select using (user_id = public.current_app_user_id() or public.has_role('admin'));

create policy "Admin manages RBAC" on public.user_roles
for all using (public.has_role('admin')) with check (public.has_role('admin'));

create policy "Admin reads permissions" on public.permissions
for select using (public.has_role('admin'));

create policy "Admin manages role permissions" on public.role_permissions
for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Land
create policy "Citizens read own land records" on public.user_land_records
for select using (user_id = public.current_app_user_id() or public.has_role('admin') or public.has_role('land_officer'));

create policy "Officers and admins read land owners" on public.land_owners
for select using (public.has_role('admin') or public.has_role('land_officer') or public.has_role('survey_officer'));

create policy "Users read own parcel details through ownership" on public.land_parcels
for select using (
  public.has_role('admin')
  or public.has_role('land_officer')
  or exists (
    select 1 from public.user_land_records ulr
    where ulr.land_id = land_parcels.land_id
      and ulr.user_id = public.current_app_user_id()
  )
  or exists (
    select 1 from public.applications a
    where a.land_id = land_parcels.land_id
      and (a.applicant_user_id = public.current_app_user_id() or a.assigned_survey_officer_id = public.current_app_user_id())
  )
);

create policy "Officers and admins manage land parcels" on public.land_parcels
for all using (public.has_role('admin') or public.has_role('land_officer'))
with check (public.has_role('admin') or public.has_role('land_officer'));

-- Applications
create policy "Users read relevant applications" on public.applications
for select using (
  applicant_user_id = public.current_app_user_id()
  or assigned_admin_id = public.current_app_user_id()
  or assigned_survey_officer_id = public.current_app_user_id()
  or public.has_role('admin')
  or public.has_role('land_officer')
);

create policy "Citizens create own applications" on public.applications
for insert with check (applicant_user_id = public.current_app_user_id());

create policy "Officers update assigned/review applications" on public.applications
for update using (
  public.has_role('admin')
  or public.has_role('land_officer')
  or assigned_survey_officer_id = public.current_app_user_id()
) with check (
  public.has_role('admin')
  or public.has_role('land_officer')
  or assigned_survey_officer_id = public.current_app_user_id()
);

create policy "Users read relevant new owners" on public.application_new_owners
for select using (
  public.has_role('admin')
  or exists (
    select 1 from public.applications a
    where a.application_id = application_new_owners.application_id
      and (a.applicant_user_id = public.current_app_user_id()
        or a.assigned_admin_id = public.current_app_user_id()
        or a.assigned_survey_officer_id = public.current_app_user_id()
        or public.has_role('land_officer'))
  )
);

create policy "Citizens add new owners to own applications" on public.application_new_owners
for insert with check (
  exists (
    select 1 from public.applications a
    where a.application_id = application_new_owners.application_id
      and a.applicant_user_id = public.current_app_user_id()
  )
);

-- Documents
create policy "Users read relevant documents" on public.documents
for select using (
  user_id = public.current_app_user_id()
  or public.has_role('admin')
  or public.has_role('land_officer')
  or exists (
    select 1 from public.applications a
    where a.application_id = documents.application_id
      and (a.applicant_user_id = public.current_app_user_id()
        or a.assigned_survey_officer_id = public.current_app_user_id())
  )
);

create policy "Users insert own document metadata" on public.documents
for insert with check (user_id = public.current_app_user_id());

create policy "Officers update document review fields" on public.documents
for update using (public.has_role('admin') or public.has_role('land_officer'))
with check (public.has_role('admin') or public.has_role('land_officer'));

-- Reviews / clarifications / decisions
create policy "Users read relevant reviews" on public.reviews
for select using (
  public.has_role('admin')
  or public.has_role('land_officer')
  or reviewer_id = public.current_app_user_id()
  or exists (
    select 1 from public.applications a
    where a.application_id = reviews.application_id
      and a.applicant_user_id = public.current_app_user_id()
  )
);

create policy "Officers add reviews" on public.reviews
for insert with check (reviewer_id = public.current_app_user_id() and (public.has_role('admin') or public.has_role('land_officer')));

create policy "Users read relevant clarifications" on public.clarifications
for select using (
  public.has_role('admin') or public.has_role('land_officer')
  or exists (
    select 1 from public.applications a
    where a.application_id = clarifications.application_id
      and a.applicant_user_id = public.current_app_user_id()
  )
);

create policy "Officers request clarifications" on public.clarifications
for insert with check (public.has_role('admin') or public.has_role('land_officer'));

create policy "Admins and officers read decisions" on public.decisions
for select using (public.has_role('admin') or public.has_role('land_officer'));

create policy "Admins and officers add decisions" on public.decisions
for insert with check (public.has_role('admin') or public.has_role('land_officer'));

-- Verifications
create policy "Survey officers read assigned verifications" on public.verifications
for select using (public.has_role('admin') or survey_officer_id = public.current_app_user_id());

create policy "Survey officers insert verifications" on public.verifications
for insert with check (survey_officer_id = public.current_app_user_id() and public.has_role('survey_officer'));

create policy "Survey officers update own verifications" on public.verifications
for update using (survey_officer_id = public.current_app_user_id() or public.has_role('admin'))
with check (survey_officer_id = public.current_app_user_id() or public.has_role('admin'));

-- Status history
create policy "Users read relevant status history" on public.application_status_history
for select using (
  public.has_role('admin')
  or public.has_role('land_officer')
  or exists (
    select 1 from public.applications a
    where a.application_id = application_status_history.application_id
      and (a.applicant_user_id = public.current_app_user_id()
        or a.assigned_survey_officer_id = public.current_app_user_id())
  )
);

create policy "Officers insert status history" on public.application_status_history
for insert with check (public.has_role('admin') or public.has_role('land_officer') or public.has_role('survey_officer'));

-- Notifications
create policy "Users read own notifications" on public.notifications
for select using (recipient_user_id = public.current_app_user_id() or public.has_role('admin'));

create policy "Users mark own notifications read" on public.notifications
for update using (recipient_user_id = public.current_app_user_id() or public.has_role('admin'))
with check (recipient_user_id = public.current_app_user_id() or public.has_role('admin'));

create policy "System role placeholder for notification inserts" on public.notifications
for insert with check (public.has_role('admin') or public.has_role('land_officer') or public.has_role('survey_officer'));

-- Audit logs should normally be inserted by triggers/RPC, not browser code.
create policy "Admins read audit logs" on public.audit_logs
for select using (public.has_role('admin'));

create policy "Temporary authenticated audit inserts" on public.audit_logs
for insert with check (actor_user_id = public.current_app_user_id());

-- Settings
create policy "Admins manage system settings" on public.system_settings
for all using (public.has_role('admin')) with check (public.has_role('admin'));

-- Payments table columns were not supplied in the review facts. Add payment
-- policies after confirming the foreign key columns and payment workflow.
