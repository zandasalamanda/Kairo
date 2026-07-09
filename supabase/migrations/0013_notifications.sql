-- Email notifications: per-user preferences, a dedupe log, and a prefs RPC.
-- (Users can't UPDATE users_profile directly since 0012, so preference changes go
--  through a SECURITY DEFINER function scoped to the calling user.)

alter table public.users_profile
  add column if not exists notify_email boolean not null default true,
  add column if not exists notify_deadlines boolean not null default true,
  add column if not exists notify_nudges boolean not null default true,
  add column if not exists notify_digest boolean not null default true,
  add column if not exists unsubscribe_token text,
  add column if not exists last_digest_at timestamptz,
  add column if not exists last_nudge_at timestamptz;

-- Stable unsubscribe token for existing + future rows.
update public.users_profile set unsubscribe_token = encode(gen_random_bytes(16), 'hex') where unsubscribe_token is null;
alter table public.users_profile alter column unsubscribe_token set default encode(gen_random_bytes(16), 'hex');
create unique index if not exists users_profile_unsub_idx on public.users_profile(unsubscribe_token);

-- Each (user, kind, ref) email sends at most once.
create table if not exists public.notifications_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  kind text not null,
  ref text not null default '',
  sent_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
create index if not exists notifications_log_user_idx on public.notifications_log(user_id);
alter table public.notifications_log enable row level security;
-- No client policies: only the service-role cron reads/writes this table.

-- Update only the caller's notification prefs (they lack UPDATE on the table).
create or replace function public.set_notification_prefs(
  p_email boolean, p_deadlines boolean, p_nudges boolean, p_digest boolean
) returns void language sql security definer set search_path = public as $$
  update public.users_profile
     set notify_email = coalesce(p_email, notify_email),
         notify_deadlines = coalesce(p_deadlines, notify_deadlines),
         notify_nudges = coalesce(p_nudges, notify_nudges),
         notify_digest = coalesce(p_digest, notify_digest)
   where clerk_user_id = (auth.jwt() ->> 'sub');
$$;
revoke all on function public.set_notification_prefs(boolean, boolean, boolean, boolean) from public, anon;
grant execute on function public.set_notification_prefs(boolean, boolean, boolean, boolean) to authenticated;
