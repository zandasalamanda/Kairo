-- Focus sessions: one row each time the user completes a focus session on a step.
-- Powers momentum (a focus streak) and per-goal focus time in Review. Minimal by
-- design — just enough to answer "did I show up, and where did the time go".
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete cascade,
  node_id uuid references public.goal_nodes(id) on delete set null,
  minutes int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists focus_sessions_user_idx on public.focus_sessions(user_id, created_at);

alter table public.focus_sessions enable row level security;
create policy focus_sessions_own on public.focus_sessions
  for all using (user_id = public.current_profile_id())
  with check (user_id = public.current_profile_id());
