# Supabase Setup For Digi-Land Demo

## Local Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these in `.env.local`:

```env
VITE_SUPABASE_URL=https://ozrbinmqhtbpqoehotjc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
# or legacy fallback:
# VITE_SUPABASE_ANON_KEY=
```

Never add a service role key, database password, or admin API secret to frontend env vars.

## Auth Users

Create Supabase Auth users manually for the demo accounts, then link each `auth.users.id` to `public.users.auth_user_id`.

| Email | DB role | UI role |
| --- | --- | --- |
| `shahed.admin@digiland.demo` | `super_admin` | `admin` |
| `farhana.akter@digiland.demo` | `admin` | `admin` |
| `rahim.uddin@digiland.demo` | `survey_officer` | `survey_officer` |
| `sadia.islam@digiland.demo` | `reviewer` | `land_officer` |
| `nusrat.jahan@digiland.demo` | `applicant` | `citizen` |
| `abdul.karim@digiland.demo` | `applicant` | `citizen` |

Set Shahed's Auth password manually in the Supabase dashboard to `Shahedadmin`. Do not store this password in source code or in `public.users.password_hash`.

Example link:

```sql
update public.users
set auth_user_id = '<auth.users.id>'
where email = 'shahed.admin@digiland.demo';
```

## RLS

Review `supabase/migrations/0001_digiland_rls_policies_draft.sql` before applying it. After applying, verify:

```sql
select * from pg_policies where schemaname = 'public';
```

The draft treats:

- `applicant` as citizen access
- `reviewer` as land officer/reviewer access
- `admin` and `super_admin` as admin access

## Demo Limitations

- Public registration always creates applicant/citizen users.
- Admin/officer role assignment is manual SQL for this demo unless an admin-only role management flow is added.
- Browser audit logs are demo-only and must not be trusted for production.
- Document uploads currently insert metadata only; Supabase Storage upload and storage RLS are not implemented yet.
