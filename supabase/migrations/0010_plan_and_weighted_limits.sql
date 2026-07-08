-- Weighted AI budgets + plan lookup for Free/Pro gating.
-- rate_limit_hit_cost: like rate_limit_hit but increments by p_cost (so an
-- expensive call like goal-map can spend more "credits" than a cheap helper).
create or replace function public.rate_limit_hit_cost(p_key text, p_limit int, p_window_seconds int, p_cost int)
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
  values (p_key, v_now, p_cost)
  on conflict (key) do update set
    count = case when rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                 then p_cost else rate_limits.count + p_cost end,
    window_start = case when rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
                 then v_now else rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;
revoke all on function public.rate_limit_hit_cost(text, int, int, int) from public;
grant execute on function public.rate_limit_hit_cost(text, int, int, int) to anon, authenticated, service_role;

-- plan_for: the user's plan (free|pro) by Clerk sub, bypassing RLS so the AI
-- guard (anon client, no JWT) can read it. Defaults to 'free'.
create or replace function public.plan_for(p_sub text)
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce((select plan from public.users_profile where clerk_user_id = p_sub limit 1), 'free');
$$;
revoke all on function public.plan_for(text) from public;
grant execute on function public.plan_for(text) to anon, authenticated, service_role;
