-- Kairo schema + row-level security.
-- Auth is Clerk: rows are scoped by the Clerk user id carried in the JWT `sub`
-- claim (configure Supabase to accept Clerk-issued JWTs). Apply with the
-- Supabase CLI/MCP or the SQL editor. Safe to run once.

create extension if not exists "pgcrypto";

-- Resolve the current user's profile id from the Clerk JWT `sub`.
create or replace function public.current_profile_id() returns uuid
language sql stable as $$
  select id from public.users_profile where clerk_user_id = (auth.jwt() ->> 'sub')
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------- tables ----------

create table if not exists public.users_profile (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  email text,
  display_name text,
  stripe_customer_id text,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive','trialing','active','past_due','canceled')),
  subscription_price_id text,
  plan text not null default 'free' check (plan in ('free','pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active','paused','done','archived')),
  progress int not null default 0 check (progress between 0 and 100),
  target_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists goals_user_idx on public.goals(user_id);

create table if not exists public.goal_nodes (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  parent_id uuid references public.goal_nodes(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'not_started'
    check (status in ('not_started','in_motion','blocked','at_risk','done')),
  progress int not null default 0 check (progress between 0 and 100),
  priority int not null default 3,
  estimated_minutes int not null default 60,
  due_date timestamptz,
  position_x double precision,
  position_y double precision,
  ai_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists goal_nodes_goal_idx on public.goal_nodes(goal_id);

create table if not exists public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  content text not null,
  category text not null default 'unsorted'
    check (category in ('unsorted','must_do','high_impact','quick_win','can_wait','not_worth_doing')),
  source text not null default 'manual',
  converted_goal_id uuid references public.goals(id) on delete set null,
  converted_node_id uuid references public.goal_nodes(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists inbox_user_idx on public.inbox_items(user_id);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  plan_date date not null,
  available_minutes int not null default 60,
  energy_level text not null default 'normal' check (energy_level in ('low','normal','high')),
  context text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);
create index if not exists daily_plans_user_idx on public.daily_plans(user_id);

create table if not exists public.daily_plan_blocks (
  id uuid primary key default gen_random_uuid(),
  daily_plan_id uuid not null references public.daily_plans(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  node_id uuid references public.goal_nodes(id) on delete set null,
  title text not null,
  description text not null default '',
  start_time timestamptz,
  end_time timestamptz,
  duration_minutes int not null default 30,
  status text not null default 'planned'
    check (status in ('planned','in_progress','completed','pushed','skipped')),
  reason text not null default '',
  difficulty text not null default 'moderate' check (difficulty in ('light','moderate','deep')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists blocks_plan_idx on public.daily_plan_blocks(daily_plan_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  review_type text not null default 'daily' check (review_type in ('daily','weekly','recovery')),
  summary text not null default '',
  changes jsonb not null default '[]',
  risks jsonb not null default '[]',
  recovery_plan jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists reviews_user_idx on public.reviews(user_id);

create table if not exists public.ai_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  event_type text not null,
  input jsonb,
  output jsonb,
  model text,
  created_at timestamptz not null default now()
);
create index if not exists ai_events_user_idx on public.ai_events(user_id);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['users_profile','goals','goal_nodes','inbox_items','daily_plans','daily_plan_blocks']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- row-level security ----------
alter table public.users_profile     enable row level security;
alter table public.goals              enable row level security;
alter table public.goal_nodes         enable row level security;
alter table public.inbox_items        enable row level security;
alter table public.daily_plans        enable row level security;
alter table public.daily_plan_blocks  enable row level security;
alter table public.reviews            enable row level security;
alter table public.ai_events          enable row level security;

-- Profile: a user sees/edits only their own row.
create policy profile_self on public.users_profile
  for all using (clerk_user_id = (auth.jwt() ->> 'sub'))
  with check (clerk_user_id = (auth.jwt() ->> 'sub'));

-- Tables owned directly via user_id.
create policy goals_own on public.goals
  for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy inbox_own on public.inbox_items
  for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy plans_own on public.daily_plans
  for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy reviews_own on public.reviews
  for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());
create policy ai_events_own on public.ai_events
  for all using (user_id = public.current_profile_id()) with check (user_id = public.current_profile_id());

-- Tables owned indirectly.
create policy nodes_own on public.goal_nodes
  for all using (goal_id in (select id from public.goals where user_id = public.current_profile_id()))
  with check (goal_id in (select id from public.goals where user_id = public.current_profile_id()));
create policy blocks_own on public.daily_plan_blocks
  for all using (daily_plan_id in (select id from public.daily_plans where user_id = public.current_profile_id()))
  with check (daily_plan_id in (select id from public.daily_plans where user_id = public.current_profile_id()));
