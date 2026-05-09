# Digi-Land: Digital Land Record and Mutation Portal

Digi-Land is a React + TypeScript web application that simulates a land record and mutation workflow for Bangladesh. It provides role-based dashboards for citizens, land officers, survey officers, and admins, with application tracking, review, verification, notifications, and audit logs.

## What this project consists of

### Core app modules

- Authentication and session context: `src/contexts/AuthContext.tsx`
- Route setup and role-based protection: `src/App.tsx`, `src/components/ProtectedRoute.tsx`
- Supabase-backed data service: `src/services/storageService.ts`
- Supabase browser client: `src/integrations/supabase/client.ts`
- Supabase type placeholders: `src/integrations/supabase/types.ts`
- RLS policy draft: `supabase/migrations/0001_digiland_rls_policies_draft.sql`
- Domain types: `src/types/index.ts`
- Location hierarchy data (district -> upazila -> mouza): `src/data/locationData.ts`

### Page groups

- Public pages: landing, login, register
- Citizen pages: dashboard, new application, my applications, application details, land search, notifications, profile
- Land officer pages: dashboard, all applications, review application, clarifications
- Survey officer pages: dashboard, assigned verifications, verification details
- Admin pages: dashboard, users, land records, audit log, analytics

All pages are in `src/pages` and grouped by role (`src/pages/citizen`, `src/pages/officer`, `src/pages/survey`, `src/pages/admin`).

### UI system

- shadcn/ui + Radix UI components in `src/components/ui`
- Shared app components in `src/components` (dashboard layout, status badge, timeline, stat card)
- Styling: Tailwind CSS with custom tokens in `src/index.css` and `tailwind.config.ts`

## How it works

## 1) Startup and routing

Application startup is in `src/main.tsx`, which renders `src/App.tsx`.

`src/App.tsx` wires these providers:

- `QueryClientProvider` (TanStack React Query)
- `TooltipProvider`
- `Toaster` and `Sonner` for notifications
- `AuthProvider`
- `HashRouter` for GitHub Pages compatibility

Routes are public or protected. Protected routes are wrapped with `ProtectedRoute` and allow only specific roles.

## 2) Authentication model

`AuthProvider` handles:

- Login with email/password lookup from Supabase-backed users
- Registration with Supabase Auth sign-up
- Session persistence through Supabase Auth
- Audit log entries for login/register/logout actions

Important: UI roles are hints only. Real authorization must be enforced by Supabase RLS policies.

## 3) Data model and persistence

This project is hosted as a static GitHub Pages app. The backend is Supabase, accessed directly from the browser with the public Supabase URL and publishable key, or legacy anon key.

Supabase tables used by `storageService.ts`:

- `users`, `roles`, `user_roles`
- `land_parcels`
- `applications`, `application_new_owners`, `application_status_history`
- `documents`, `reviews`, `verifications`
- `notifications`, `audit_logs`

The service keeps an in-memory cache after initial load because the current UI reads data synchronously in many pages. Runtime data is not backed by `localStorage`.

## 4) End-to-end workflow

### Citizen flow

1. Register or log in.
2. Create a mutation application (multi-step form with land and transfer details).
3. Track status timeline and review/verification updates.
4. View notifications and personal profile.

### Land officer flow

1. View all submitted applications.
2. Review details and leave comments.
3. Request clarification, assign survey officer, and update status.

### Survey officer flow

1. View assigned verifications.
2. Inspect application details.
3. Add verification findings and mark verification outcome.

### Admin flow

1. Monitor system-wide metrics and charts.
2. Manage users and land records.
3. Review audit logs and analytics.

## Routes overview

### Public

- `/`
- `/login`
- `/register`

### Citizen

- `/citizen`
- `/citizen/new-application`
- `/citizen/applications`
- `/citizen/applications/:id`
- `/citizen/land-search`
- `/citizen/notifications`
- `/citizen/profile`

### Land officer

- `/officer`
- `/officer/applications`
- `/officer/applications/:id`
- `/officer/clarifications`

### Survey officer

- `/survey`
- `/survey/verifications`
- `/survey/verifications/:id`

### Admin

- `/admin`
- `/admin/users`
- `/admin/land-records`
- `/admin/audit-log`
- `/admin/analytics`

## Tech stack

- React 18 + TypeScript
- Vite
- React Router v6
- Tailwind CSS
- shadcn/ui + Radix UI
- React Hook Form + Zod
- TanStack React Query
- Supabase JavaScript client
- Recharts
- Vitest + Testing Library

See exact dependency versions in `package.json`.

## Local development

Prerequisites:

- Node.js 18+ (or Bun runtime)

Install dependencies:

```bash
npm install
```

Create a local `.env.local` file:

```bash
cp .env.example .env.local
```

Fill in the Supabase values:

```bash
VITE_SUPABASE_URL=https://ozrbinmqhtbpqoehotjc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
# or legacy fallback:
# VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Set up Supabase:

1. Review `supabase/migrations/0001_digiland_rls_policies_draft.sql`.
2. Add or confirm a secure mapping from `public.users` to `auth.users`, such as `users.auth_user_id`.
3. Apply reviewed RLS policies in Supabase SQL Editor.
4. Use Project Settings > API to copy the Project URL and publishable key, or legacy anon key.

Run the Vite dev server:

```bash
npm run dev
```

Build production bundle:

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

Lint:

```bash
npm run lint
```

Run tests:

```bash
npm run test
npm run test:watch
```

Equivalent Bun commands also work (`bun install`, `bun run dev`, etc.).

## Demo accounts

Demo quick-login buttons use these emails and password `demo1234`, but they only work if matching Supabase Auth users and `public.users` profiles exist:

- `citizen@demo.com`
- `officer@demo.com`
- `survey@demo.com`
- `admin@demo.com`

## Testing status

Vitest is configured (`vitest.config.ts`) with setup in `src/test/setup.ts`.
Current test coverage is minimal (placeholder example test in `src/test/example.test.ts`).

## Deployment notes (GitHub Pages)

This is a Vite SPA deployed by `.github/workflows/deploy-pages.yml`.

Before deployment:

1. Review and apply `supabase/migrations/0001_digiland_rls_policies_draft.sql` in Supabase.
2. Add these GitHub repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` preferred, or `VITE_SUPABASE_ANON_KEY`
3. Push to `main` or run the workflow manually.

The workflow sets `VITE_BASE_PATH` for the repository pages path and uploads `dist/` to GitHub Pages.

For GitHub Pages deployment, verify:

1. Vite `base` path in `vite.config.ts` if deploying to a project subpath.
2. The app continues to use `HashRouter` unless you add a custom SPA fallback.
3. Build output from `dist/` is what gets deployed.

Supabase Auth redirect URLs to configure:

- `http://localhost:5173`
- `http://localhost:5173/*`
- `https://shahrier.tech`
- `https://shahrier.tech/*`
- `https://shahrier.tech/digiland_demo1.github.io`
- `https://shahrier.tech/digiland_demo1.github.io/*`
- `https://shahed-shahrier.github.io/digiland_demo1.github.io`
- `https://shahed-shahrier.github.io/digiland_demo1.github.io/*`

## Current limitations

- RLS policies are a draft and must be reviewed before production
- Some enum values and ownership joins need live-schema verification
- Audit inserts from the browser are temporary and should move to DB triggers/RPC/server-side code
- File upload storage is not implemented; the app inserts document metadata only

Use this codebase as a prototype/demo foundation, not a production-ready secured system.
