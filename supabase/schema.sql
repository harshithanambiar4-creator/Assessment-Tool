-- Run this once in Supabase → SQL Editor → New query → paste → Run.
-- It creates the single table the app stores everything in (batches, participants, coach passphrase).

create table if not exists public.kv (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kv enable row level security;

-- The app talks to Supabase with the public "anon" key, so it needs permission to read and write.
-- NOTE: this is the same trust level as the original prototype — see "Security" in README.md.
drop policy if exists "app can read"   on public.kv;
drop policy if exists "app can insert" on public.kv;
drop policy if exists "app can update" on public.kv;

create policy "app can read"   on public.kv for select to anon using (true);
create policy "app can insert" on public.kv for insert to anon with check (true);
create policy "app can update" on public.kv for update to anon using (true) with check (true);
-- No delete policy: nobody can delete records from the app.

-- Newer Supabase projects don't always give the app's public key access to new tables automatically.
grant usage on schema public to anon;
grant select, insert, update on public.kv to anon;
