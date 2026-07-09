-- Defense-in-depth for the AI limiter: clamp inputs so that even if execute is
-- ever granted to a client again, a caller can't reset their counter
-- (p_window_seconds <= 0 tripping the "expired" branch) or refund budget
-- (negative p_cost). Also re-asserts service_role-only execution.
create or replace function public.rate_limit_hit_cost(p_key text, p_limit int, p_window_seconds int, p_cost int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_window int := greatest(1, p_window_seconds);
  v_cost int := greatest(0, p_cost);
begin
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_now, v_cost)
  on conflict (key) do update set
    count = case when rate_limits.window_start < v_now - make_interval(secs => v_window)
                 then v_cost else rate_limits.count + v_cost end,
    window_start = case when rate_limits.window_start < v_now - make_interval(secs => v_window)
                 then v_now else rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit_cost(text, int, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit_cost(text, int, int, int) to service_role;
