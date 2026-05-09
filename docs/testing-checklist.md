# Digi-Land Testing Checklist

Use this checklist after adding Supabase env vars and applying reviewed RLS policies.

| Test | Expected result | Likely failure point | Inspect |
| --- | --- | --- | --- |
| Load land records | Land Search and admin Land Records display Supabase parcels | RLS blocks `land_parcels` select or missing owner mapping | `src/services/storageService.ts`, `getLandRecords`, `mapLandRecord` |
| Sign up | Supabase Auth account is created and an applicant/citizen `users` profile row is inserted | Missing `users.auth_user_id`, RLS blocks `users` insert, email confirmation required | `src/contexts/AuthContext.tsx`, `createUserProfile`, `src/lib/roles.ts` |
| Public role escalation attempt | Register page has no admin/officer/survey role picker and registration ignores caller-supplied roles | Old role dropdown or unsafe metadata returned | `src/pages/RegisterPage.tsx`, `AuthContext.register`, `src/lib/roles.ts` |
| Log in | `signInWithPassword` returns a session and profile loads by email | User exists in Auth but not `users`; RLS blocks profile read | `src/contexts/AuthContext.tsx`, `getUserProfileByEmail` |
| Refresh session | Reload keeps user signed in through Supabase session | Auth redirect/session storage issue | `AuthProvider`, `supabase.auth.getSession` |
| Log out | Session clears and protected routes redirect to login | `signOut` error or stale state | `DashboardLayout`, `AuthContext.logout` |
| Create application | New `applications` row and document metadata are inserted | RLS blocks insert, enum value mismatch, missing land id | `addApplication` |
| Insert document metadata | `documents` rows appear for the application | RLS blocks insert, enum mismatch | `addApplication`, `documents` insert |
| Add review comment | `reviews` row is inserted and UI shows comment | RLS blocks officer insert, `review_type` enum mismatch | `addComment` |
| Change status | `applications.current_status` updates and history row inserts | RLS blocks update/insert, enum mismatch | `changeApplicationStatus`, `updateApplication` |
| Add verification note | `verifications` row inserts for assigned survey officer | RLS blocks insert, `result` enum mismatch | `addVerificationNote` |
| Send notification | `notifications` row inserts for recipient user | RLS blocks insert | `addNotification` |
| Mark notification read | `notifications.is_read` updates only for own rows | RLS blocks update or id mismatch | `markNotificationRead`, `markAllNotificationsRead` |
| Read audit logs as admin | Admin or super admin Audit Log shows rows | RLS role mapping fails or no admin/super_admin role | `getAuditLogs`, RLS `private.is_admin()` |
| Verify non-admin cannot read audit logs | Non-admin receives RLS denial or empty rows | Overbroad audit policy | `audit_logs` policies |
