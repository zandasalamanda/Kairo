-- Per-user rate limiting for the AI endpoints, stored in Postgres (no extra
-- service). A fixed-window counter keyed by an arbitrary string; the guard
-- (lib/ai/guard.ts) calls rate_limit_hit() with a per-minute and per-day key.

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);
alter table public.rate_limits enable row level security;
-- No policies: RLS is on but only the SECURITY DEFINER function below touches
-- the table (it runs as the owner, which bypasses RLS).

create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update set
    count = case when rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                 then 1 else rate_limits.count + 1 end,
    window_start = case when rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                 then v_now else rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, int, int) from public;
grant execute on function public.rate_limit_hit(text, int, int) to anon, authenticated, service_role;
