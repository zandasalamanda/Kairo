-- Cache the real, resolved resource (a live YouTube video etc.) on the node the
-- first time it's looked up, so we never re-hit the search API and the link is
-- instant + guaranteed-live thereafter. Shape: {url,title,source,thumbnail}.
alter table public.goal_nodes add column if not exists resource_resolved jsonb;
