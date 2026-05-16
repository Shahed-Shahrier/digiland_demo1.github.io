# Digi-Land

Digi-Land is a role-based digital land record and mutation portal prototype for Bangladesh. It lets citizens search land records, view their properties, submit ownership transfer applications, upload required PDF documents, and track application progress. Land officers, survey officers, and admins get separate dashboards for review, verification, user management, land record management, analytics, notifications, and audit history.

The project is a static Vite React app designed for GitHub Pages, with Supabase used for authentication, database access, storage, and row-level security.

## Key Features

- Role-based dashboards for citizens, land officers, survey officers, and admins
- Supabase Auth login, registration, and session persistence
- Protected routes with role-aware navigation
- Page loading indicators for login and route transitions
- Responsive top navigation with optional collapsed side navigation
- Citizen land search and "My Properties" views based on NID ownership
- New application flow for transfer-to-user and transfer-from-user cases
- Transfer applications linked to both current-owner and proposed-owner NIDs
- Required PDF document upload and document opening from Supabase Storage
- Officer review, comments, clarification requests, and survey assignment
- Survey verification notes and verification status filtering
- Admin user role filtering, land record management, audit log, and analytics
- Automatic land ownership transfer after approval
- Notifications and status timeline for application tracking

## Tools Used

- React 18
- TypeScript
- Vite
- React Router
- Supabase Auth, Database, Storage, and RLS policies
- TanStack React Query
- Tailwind CSS
- shadcn/ui
- Radix UI
- Lucide React icons
- Recharts
- Vitest
- Testing Library
- ESLint
- GitHub Pages

See exact package versions in `package.json`.

## Project Structure

```text
src/
  App.tsx                         Route definitions and app providers
  main.tsx                        React entry point
  components/                     Shared layout, loading, status, and UI components
  components/ui/                  shadcn/ui component primitives
  contexts/AuthContext.tsx        Supabase auth/session/profile handling
  data/                           Seed and Bangladesh location data
  integrations/supabase/          Supabase browser client and DB types
  lib/                            Role and feature-route helpers
  pages/                          Public and role-specific pages
  services/storageService.ts      Supabase-backed data and workflow service
  test/                           Vitest setup and tests
  types/                          App domain types

supabase/migrations/              Database/RLS/storage migration drafts
docs/                             Setup and review notes
public/                           Static icons and public assets
```

## Roles

| UI role | Database role mapping | Main access |
| --- | --- | --- |
| `citizen` | `applicant` or `citizen` | Citizen dashboard, applications, properties, land search, notifications, profile |
| `land_officer` | `reviewer` or `land_officer` | Officer dashboard, application review, clarifications |
| `survey_officer` | `survey_officer` | Survey dashboard, assigned verifications |
| `admin` | `admin` or `super_admin` | Admin dashboard, users, land records, audit log, analytics, plus officer/survey pages |

Public registration creates citizen/applicant accounts. Privileged roles should be assigned only through an admin-controlled flow or reviewed SQL.

## Routes

Public:

- `/`
- `/login`
- `/register`

Citizen:

- `/citizen`
- `/citizen/new-application`
- `/citizen/applications`
- `/citizen/applications/:id`
- `/citizen/properties`
- `/citizen/land-search`
- `/citizen/notifications`
- `/citizen/profile`

Land officer:

- `/officer`
- `/officer/applications`
- `/officer/applications/:id`
- `/officer/clarifications`

Survey officer:

- `/survey`
- `/survey/verifications`
- `/survey/verifications/:id`

Admin:

- `/admin`
- `/admin/users`
- `/admin/land-records`
- `/admin/audit-log`
- `/admin/analytics`

## Workflow Overview

### Citizen

1. Register or log in with Supabase Auth.
2. Use land search or "My Properties" to find land records.
3. Start a new transfer application.
4. Choose transfer direction:
   - Transfer to user: search the current owner NID, choose a matching property, and set the logged-in user's NID as the proposed new owner.
   - Transfer from user: choose from properties currently listed under the logged-in user's NID.
5. Upload required PDFs: Land Deed, National ID, and Tax Receipt.
6. Track status, comments, clarifications, verification notes, and notifications.

### Land Officer

1. Review submitted applications.
2. Filter applications by status and transfer type.
3. Open uploaded PDFs.
4. Add review comments.
5. Request clarification from a citizen.
6. Assign or reassign a survey officer.
7. Approve, reject, or update application status.

### Survey Officer

1. View assigned verification cases.
2. Filter by transfer type and status.
3. Open application details and uploaded PDFs.
4. Add verification findings.
5. Mark a case verified or rejected.

### Admin

1. View platform metrics and analytics.
2. Manage users and filter users by role.
3. Manage land records and filter by district.
4. Review audit logs.
5. Access officer and survey workflows.

## Supabase Data Areas

The frontend service uses these Supabase areas:

- Auth users and session state
- `users`, `roles`, and `user_roles`
- `land_parcels` and `land_owners`
- `applications` and `application_new_owners`
- `application_status_history`
- `documents`
- `reviews`
- `clarifications`
- `verifications`
- `notifications`
- `audit_logs`
- Storage bucket for application PDFs

The app keeps an in-memory cache after loading data so existing pages can read synchronously. Data is not stored in browser `localStorage`.

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment values:

```bash
cp .env.example .env.local
```

Set the Supabase values in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# Legacy fallback if needed:
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run the development server:

```bash
npm run dev
```

The Vite dev server is configured for port `8080`.

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run tests:

```bash
npm run test
```

Run lint:

```bash
npm run lint
```

## Supabase Setup

Review the setup notes in `docs/supabase-setup.md` and the migration drafts in `supabase/migrations/`.

At minimum, verify:

- Supabase Auth is enabled for email/password login.
- `public.users.auth_user_id` links app profiles to `auth.users.id`.
- Required tables and relationships exist.
- RLS policies are reviewed before production use.
- The PDF storage bucket exists and has appropriate policies.
- GitHub Pages and localhost URLs are allowed in Supabase Auth redirect settings.

Useful policy check:

```sql
select * from pg_policies where schemaname = 'public';
```

## Security Notes

- Do not commit `.env`, `.env.local`, service role keys, database passwords, or admin API secrets.
- Vite environment variables are public in the browser. Only use Supabase publishable or anon keys there.
- Real authorization must be enforced by Supabase RLS, not only by frontend route guards.
- Public registration should remain limited to citizen/applicant accounts.
- Audit logs written from the browser are useful for demo visibility but should move to trusted server-side logic for production.
- Review storage policies so users can only upload and open documents they are allowed to access.

## Testing Status

Vitest is configured with jsdom setup in `src/test/setup.ts`.

Current tests cover:

- Basic app test setup
- Location hierarchy data
- Role mapping helpers

Run the full check before pushing:

```bash
npm run build
npm run test
npm run lint
```

## Deployment

This app is intended for GitHub Pages deployment as a Vite single-page app.

Deployment notes:

- `HashRouter` is used for GitHub Pages compatibility.
- `vite.config.ts` sets a production base path from `VITE_BASE_PATH` or the repository path.
- Public assets live in `public/`.
- Supabase values for deployment should be configured as repository secrets or build environment variables.
- `.env.local` is only for local development and should not be pushed.

Suggested deployment environment variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_BASE_PATH=/digiland_demo1.github.io/
```

## Current Limitations

- This is a prototype/demo and not a production-ready government system.
- RLS policies and schema assumptions must be reviewed against the live Supabase project before production.
- Browser-driven audit logging is not tamper-proof.
- Some pages use synchronous reads from an in-memory cache after initial Supabase loading.
- Test coverage is still light and should be expanded around workflows, permissions, document access, and approval-side ownership transfer.
