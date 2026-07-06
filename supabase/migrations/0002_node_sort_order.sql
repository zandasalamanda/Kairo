-- Preserve the path order of a goal's nodes (AI emits them in sequence).
-- priority alone isn't enough (it can repeat), and bulk-inserted rows can
-- share created_at, so ordering was nondeterministic. sort_order fixes that.
alter table public.goal_nodes add column if not exists sort_order int not null default 0;
create index if not exists goal_nodes_sort_idx on public.goal_nodes(goal_id, sort_order);
