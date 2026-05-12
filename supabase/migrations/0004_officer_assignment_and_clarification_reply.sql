-- Allow officers to load users needed for assignment and survey views.
-- Allow applicants to answer their own clarification requests.

drop policy if exists "staff can read users for workflow" on public.users;
drop policy if exists "staff can read roles for workflow" on public.user_roles;
drop policy if exists "applicants can respond to own clarifications" on public.clarifications;

create policy "staff can read users for workflow"
on public.users
for select
to authenticated
using (
  has_app_role('reviewer')
  or has_app_role('survey_officer')
  or has_app_role('admin')
  or has_app_role('super_admin')
);

create policy "staff can read roles for workflow"
on public.user_roles
for select
to authenticated
using (
  has_app_role('reviewer')
  or has_app_role('survey_officer')
  or has_app_role('admin')
  or has_app_role('super_admin')
);

create policy "applicants can respond to own clarifications"
on public.clarifications
for update
to authenticated
using (
  status = 'open'
  and exists (
    select 1
    from public.applications a
    where a.application_id = clarifications.application_id
      and a.applicant_user_id = current_app_user_id()
  )
)
with check (
  status in ('answered', 'closed')
  and responded_by = current_app_user_id()
  and exists (
    select 1
    from public.applications a
    where a.application_id = clarifications.application_id
      and a.applicant_user_id = current_app_user_id()
  )
);
