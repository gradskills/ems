# Supabase backend

This app is wired to the Supabase project **`coasdmsmcfzsamycjdzt`** ("gradskills Project").

## Environment

`.env.local` (gitignored) holds:

```
NEXT_PUBLIC_SUPABASE_URL=https://coasdmsmcfzsamycjdzt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable anon key>
# optional — improves server-route privilege; falls back to anon if unset:
# SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

If these are absent the app falls back to in-memory seed data (nothing breaks).

## How it fits together

| Concern | File |
| --- | --- |
| Browser client (anon) | `lib/supabase/client.ts` |
| Server client (service-role → anon fallback) | `lib/supabase/server.ts` |
| Row ⇄ app-object mappers | `lib/supabase/map.ts` |
| Load everything into the store + seed empty tables | `lib/supabase/hydrate.ts` |
| Write-through persistence (diffs every store mutation) | `lib/supabase/persist.ts` |
| Mount-time hydration trigger | `components/data/AppDataProvider.tsx` |
| Login (bcrypt verify) | `app/api/login/route.ts` |
| New employee (bcrypt hash + insert) | `app/api/employees/route.ts` |
| Change password (bcrypt) | `app/api/change-password/route.ts` |

- **Reads:** `AppDataProvider` calls `store.hydrateData()` once on load, which pulls every table into the zustand store. The three pre-existing HR tables (`users`, `attendance`, `leave_requests`) are the source of truth and are never seeded.
- **Seeding:** the first time a sales/CRM/QIMS table is empty, the app's demo fixtures are inserted (with demo user ids remapped onto the real team) so screens stay populated. After that it's real, editable data.
- **Writes:** the store wraps `set()` so every create/update/delete is diffed and written to Supabase. Int-keyed HR tables use dedicated helpers (`persistAttendance`, `persistLeaveApply/Decision`, `persistUserUpdate`).

## Schema notes

- New app tables use **text** primary keys (matching the app's string ids) and **jsonb** for nested arrays/objects. User references are stored as text (the DB user id as a string).
- The app's kanban tasks live in **`app_tasks`**; the original int-keyed `tasks` / `task_completions` daily-checklist tables are left untouched for a future feature.
- App user id = the DB integer id as a string (e.g. `"7"`). Legacy sales role is derived from `access_level`.

## ⚠️ Security follow-up (RLS)

All app tables currently have **Row Level Security disabled**, so anyone with the public anon key can read/write every row — **including `users.password_hash`, clock-in selfies, and GPS**. The app itself never fetches the hash (login runs server-side), but the exposure exists at the database level.

Before this is anything more than an internal prototype, enable RLS and add policies, and/or move all reads/writes behind server routes using the service-role key. A first step to hide the hash from the browser is a `users` view without `password_hash`. See https://supabase.com/docs/guides/database/postgres/row-level-security.
