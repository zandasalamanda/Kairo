-- Close an AI rate-limit bypass.
--
-- rate_limit_hit / rate_limit_hit_cost / plan_for were granted to anon +
-- authenticated so the guard (which used the anon client) could call them. But
-- that let any client holding the public anon key call them directly — e.g.
-- POST /rest/v1/rpc/rate_limit_hit_cost with p_window_seconds<=0 trips the
-- "window expired" branch and resets the caller's own counter to zero, giving
-- unlimited AI. The guard now calls these with the SERVICE-ROLE client, so
-- restrict execution to service_role only.

revoke execute on function public.rate_limit_hit(text, int, int) from anon, authenticated;
revoke execute on function public.rate_limit_hit_cost(text, int, int, int) from anon, authenticated;
revoke execute on function public.plan_for(text) from anon, authenticated;
