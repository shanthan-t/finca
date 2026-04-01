begin;

create table if not exists public.ai_router_history (
  id uuid primary key default gen_random_uuid(),
  turn_id bigint not null,
  session_id text not null default 'default',
  user_query text not null,
  intent text not null,
  api_call jsonb null,
  api_result_summary jsonb null,
  assistant_message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ai_router_history_session_turn_key unique (session_id, turn_id)
);

create index if not exists idx_ai_router_history_session_created
  on public.ai_router_history (session_id, created_at desc);

create index if not exists idx_ai_router_history_intent
  on public.ai_router_history (intent);

alter table public.ai_router_history enable row level security;

drop policy if exists "Public can read ai router history" on public.ai_router_history;
create policy "Public can read ai router history"
  on public.ai_router_history
  for select
  using (true);

drop policy if exists "Public can insert ai router history" on public.ai_router_history;
create policy "Public can insert ai router history"
  on public.ai_router_history
  for insert
  with check (true);

comment on table public.ai_router_history is 'Audit log of Finca AI router decisions, calls, and outcomes.';

commit;
