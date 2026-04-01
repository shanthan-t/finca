-- Finca initial Supabase schema
-- Paste this into the Supabase SQL Editor or run it as your first migration.

begin;

create extension if not exists pgcrypto;

create table if not exists public.batches (
  batch_id text primary key,
  crop_name text not null,
  farmer_name text not null,
  farm_location text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blocks (
  batch_id text not null references public.batches(batch_id) on delete cascade,
  "index" bigint not null check ("index" >= 0),
  "timestamp" timestamptz not null default timezone('utc', now()),
  event_type text not null,
  data jsonb not null default '{}'::jsonb,
  previous_hash text not null,
  hash text not null,
  constraint blocks_pkey primary key (batch_id, "index"),
  constraint blocks_batch_hash_key unique (batch_id, hash)
);

create index if not exists idx_batches_crop_name
  on public.batches (crop_name);

create index if not exists idx_blocks_batch_timestamp
  on public.blocks (batch_id, "timestamp" desc);

create index if not exists idx_blocks_event_type
  on public.blocks (event_type);

create index if not exists idx_blocks_data_gin
  on public.blocks
  using gin (data);

alter table public.batches enable row level security;
alter table public.blocks enable row level security;

drop policy if exists "Public can read batches" on public.batches;
create policy "Public can read batches"
  on public.batches
  for select
  using (true);

drop policy if exists "Public can read blocks" on public.blocks;
create policy "Public can read blocks"
  on public.blocks
  for select
  using (true);

drop policy if exists "Public can insert batches" on public.batches;
create policy "Public can insert batches"
  on public.batches
  for insert
  with check (true);

drop policy if exists "Public can insert blocks" on public.blocks;
create policy "Public can insert blocks"
  on public.blocks
  for insert
  with check (true);

drop policy if exists "Authenticated users can read batches" on public.batches;
create policy "Authenticated users can read batches"
  on public.batches
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can read blocks" on public.blocks;
create policy "Authenticated users can read blocks"
  on public.blocks
  for select
  to authenticated
  using (true);

comment on table public.batches is 'One agricultural product batch per verified supply chain.';
comment on table public.blocks is 'Linked custody events for each agricultural batch.';

comment on column public.blocks.previous_hash is 'Hash of the previous block in the same batch chain.';
comment on column public.blocks.hash is 'Hash of the current block, issued by the trusted chain service.';
comment on column public.blocks.data is 'Structured event metadata such as actor, location, shipment, and quality notes.';

commit;
