# Supabase Integration Review

Status: partially connected. The frontend now uses Supabase Auth and queries the real normalized Supabase tables, but end-to-end operations still require reviewed RLS policies and dashboard configuration.

## Evidence From Repo

- React app: `react`, `react-dom`, `src/main.tsx`, `src/App.tsx`
- Vite app: `vite`, `vite.config.ts`
- TypeScript app: `typescript`, `.tsx` source files
- Supabase dependency: `@supabase/supabase-js`
- Supabase client: `src/integrations/supabase/client.ts`
- Routing: `HashRouter` in `src/App.tsx`
- Auth owner: `src/contexts/AuthContext.tsx`
- Data owner: `src/services/storageService.ts`
- Env vars: `.env.example`, `.github/workflows/deploy-pages.yml`

## Current Connection State

The app is Supabase-backed, not localStorage-backed. `src` no longer uses `localStorage` for application data or custom auth. The app cannot be honestly called fully production-ready until the draft RLS migration is reviewed, applied, and tested against the live project.

## Field Mappings

| Frontend field | Database column/table | Mapping function | Unresolved mismatch | Recommended change |
| --- | --- | --- | --- | --- |
| `User.id` | `users.user_id` | `mapUser` | Supabase Auth user id is not represented in known `users` columns | Add `users.auth_user_id uuid unique references auth.users(id)` |
| `User.name` | `users.full_name` | `mapUser` | None | Keep |
| `User.email` | `users.email` | `mapUser` | `citext` is installed in public | Move extension to dedicated schema in a controlled migration |
| `User.role` | `user_roles` + `roles.role_name` | `dbRoleToFrontendRole` | DB `applicant`/`reviewer`/`super_admin` intentionally map to UI `citizen`/`land_officer`/`admin` | Keep role mapping centralized in `src/lib/roles.ts` |
| `User.password` | none | none | Removed from auth flow | Keep password out of frontend user model |
| `LandRecord.id` | `land_parcels.land_id` | `mapLandRecord` | Numeric DB id converted to string | Accept or update frontend type |
| `LandRecord.ownerName` | `land_owners` / `user_land_records` | currently fallback | Owner relationship is not created when the UI only supplies an owner name | Add owner picker backed by `users` before inserting `land_owners` |
| `LandRecord.landSize` | `land_parcels.area_size` | `mapLandRecord` / `parseAreaSize` | Numeric area rendered as string; units are not stored | Add unit column or UI formatter |
| `LandRecord.holdingNumber` | `land_parcels.holding_number`, fallback for required `khatian_number` | `addLandRecord` | UI has no dedicated khatian field | Add khatian field to admin land form |
| `LandRecord.district` | `land_parcels.district`, used to infer required `division` | `inferDivision` | UI has no division field | Add division selector to land forms |
| `Application.id` | `applications.application_number` | `mapApplication` | Update paths must resolve number id through `application_number` | Keep `application_number` unique |
| `Application.applicantId` | `applications.applicant_user_id` | `mapApplication` | Numeric DB id converted to string | Accept or update frontend type |
| `Application.status` | `applications.current_status` | `statusFromDb` / `statusToDb` | Frontend `Pending` writes DB `submitted` to avoid relying on only the DB `draft` default | Verify actual enum values before production writes |
| `Application.transferType` | `applications.transfer_type` | `transferFromDb` / `transferToDb` | Enum spelling unknown | Verify actual enum values before applying writes |
| `Application.documents` | `documents` | `mapDocument` | File storage upload is not implemented, only metadata | Add Supabase Storage bucket + policies |
| `Application.comments` | `reviews.note` | `mapReview` | `review_type` enum values unknown | Verify enum values |
| `Application.verificationNotes` | `verifications.notes` | `mapVerification` | `result` enum values unknown | Verify enum values |
| `Application.statusHistory` | `application_status_history.new_status`, `changed_at` | `mapApplication` | Frontend does not display `old_status` | Keep if old-status display is not needed |
| `Notification.userId` | `notifications.recipient_user_id` | `mapNotification` | None | Keep |
| `Notification.read` | `notifications.is_read` | `mapNotification` | None | Keep |
| `AuditLog.id` | `audit_logs.log_id` | `mapAuditLog` | Browser inserts are not trustworthy | Move audit inserts to triggers/RPC/server-side |

## Function Classification

| Function | Status |
| --- | --- |
| `getUsers` | Supabase-backed cache from `users`, `roles`, `user_roles` |
| `addUser` | Supabase profile insert helper; auth sign-up is in `AuthContext` |
| `updateUser` | Supabase `users` update |
| `deleteUser` | Supabase soft delete via `status` and `deleted_at` |
| `getLandRecords` | Supabase-backed cache from `land_parcels` |
| `addLandRecord` | Supabase `land_parcels` insert |
| `updateLandRecord` | Supabase `land_parcels` update |
| `deleteLandRecord` | Supabase archive via `current_status` |
| `getApplications` | Supabase-backed cache from `applications` plus related tables |
| `getApplicationById` | Supabase-backed cache lookup |
| `addApplication` | Supabase `applications` insert plus document metadata |
| `updateApplication` | Supabase `applications` update |
| `changeApplicationStatus` | Supabase `applications` update plus `application_status_history` insert |
| `addComment` | Supabase `reviews` insert |
| `addVerificationNote` | Supabase `verifications` insert |
| `getNotifications` | Supabase-backed cache from `notifications` |
| `getNotificationsForUser` | Supabase-backed cache filter |
| `addNotification` | Supabase `notifications` insert |
| `markNotificationRead` | Supabase `notifications.is_read` update |
| `markAllNotificationsRead` | Supabase bulk notification update |
| `getAuditLogs` | Supabase-backed cache from `audit_logs` |
| `addAuditLog` | Temporary browser insert; must move to trusted DB trigger/RPC |

## Security Findings

- Critical: if RLS blocks a table for the current role, that cache now remains empty instead of failing login; policies still determine real access.
- Critical: `public.rls_auto_enable()` should not be executable by `anon` or `authenticated`; the draft migration revokes it.
- Critical: frontend role values are UI hints only. Real authorization must be enforced by RLS.
- Fixed in frontend: public registration no longer exposes staff/admin role selection and always requests an applicant/citizen profile.
- Critical: do not add a service role key to GitHub Pages or Vite env vars.
- Warning: `citext` installed in `public` should be reviewed and moved if needed.
- Warning: audit log writes from the browser are not trustworthy and should become trigger/RPC/server-side behavior.

## Routing And Deployment

- The app uses `HashRouter`, which is appropriate for GitHub Pages without rewrite support.
- `vite.config.ts` uses `/digiland_demo1.github.io/` by default for production.
- If hosted at custom domain root `https://shahrier.tech/`, set `VITE_BASE_PATH=/`.

## Supabase Auth Redirect URLs To Configure

- `http://localhost:5173`
- `http://localhost:5173/*`
- `https://shahrier.tech`
- `https://shahrier.tech/*`
- `https://shahrier.tech/digiland_demo1.github.io`
- `https://shahrier.tech/digiland_demo1.github.io/*`
- `https://shahed-shahrier.github.io/digiland_demo1.github.io`
- `https://shahed-shahrier.github.io/digiland_demo1.github.io/*`

## Manual Work Still Required

1. Add `VITE_SUPABASE_URL` and either `VITE_SUPABASE_PUBLISHABLE_KEY` or `VITE_SUPABASE_ANON_KEY`.
2. Review and apply `supabase/migrations/0001_digiland_rls_policies_draft.sql`.
3. Add or confirm `users.auth_user_id` mapping to Supabase Auth users.
4. Verify enum values before writes are used in production.
5. Configure Supabase Auth redirect URLs.
6. Test with real user accounts and RLS enabled.
7. Create and link Supabase Auth users for the seeded demo emails listed in `docs/supabase/setup.md`.
