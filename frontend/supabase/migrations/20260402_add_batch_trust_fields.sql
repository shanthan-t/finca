begin;

alter table public.batches
  add column if not exists farmer_phone text,
  add column if not exists farmer_verified boolean not null default false,
  add column if not exists qr_code_url text;

commit;
