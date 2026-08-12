-- Migration 0004: shared monthly dashboard data snapshots.
create table if not exists public.dashboard_snapshots (
  id           bigint generated always as identity primary key,
  uploaded_by  text,
  uploaded_at  timestamptz not null default now(),
  file_name    text,
  row_count    int,
  data         jsonb not null
);
create index if not exists idx_snapshots_uploaded_at on public.dashboard_snapshots(uploaded_at desc);

alter table public.dashboard_snapshots enable row level security;
-- App uses the anon key with a client-side login gate; allow read + insert.
drop policy if exists ds_read on public.dashboard_snapshots;
create policy ds_read on public.dashboard_snapshots for select to anon, authenticated using (true);
drop policy if exists ds_insert on public.dashboard_snapshots;
create policy ds_insert on public.dashboard_snapshots for insert to anon, authenticated with check (true);
