# Supabase setup

Kairo runs on seeded demo data until Supabase is configured. To switch on real,
per-user, multi-device persistence:

1. **Create a project** at supabase.com and grab the URL + anon key + service-role key.
2. **Set env** (see `../.env.example`): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Apply the schema** — run `migrations/0001_init.sql` via the Supabase SQL editor,
   the CLI (`supabase db push`), or the Supabase MCP `apply_migration`. It creates
   every table with RLS.
4. **Wire Clerk → Supabase auth.** RLS scopes rows by the Clerk user id in the JWT
   `sub` claim, so configure Supabase to accept Clerk-issued JWTs (Clerk's Supabase
   integration / a JWT template), and pass the token to `getSupabaseServer(token)`.

Once configured, `lib/config.ts` flips `features.supabase` on. The client helpers
live in `lib/supabase/{client,server}.ts`; swap the seeded reads in `lib/data`
for Supabase queries (each function is already the single integration point).

The RLS model: `users_profile` is self-scoped by `clerk_user_id`; every other table
is scoped through `public.current_profile_id()`.
