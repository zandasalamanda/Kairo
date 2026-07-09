-- Proof-of-Progress: a piece of evidence attached to a completed step (a link,
-- a note, or a metric). This is the substrate for the "verified" map + portfolio.
create table if not exists public.node_evidence (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.goal_nodes(id) on delete cascade,
  user_id uuid not null references public.users_profile(id) on delete cascade,
  kind text not null check (kind in ('link','note','metric')),
  value text not null default '',
  label text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists node_evidence_node_idx on public.node_evidence(node_id);
create index if not exists node_evidence_user_idx on public.node_evidence(user_id);

alter table public.node_evidence enable row level security;
create policy evidence_own on public.node_evidence
  for all using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());
