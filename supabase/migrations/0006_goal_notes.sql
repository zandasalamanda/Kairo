-- Per-goal notebook: freeform context/thoughts the user writes on a goal.
-- Aether folds these into ask / break-down calls as context (no extra prompts).
alter table public.goals add column if not exists notes text not null default '';
