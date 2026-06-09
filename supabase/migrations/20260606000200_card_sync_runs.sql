create type public.card_sync_status as enum ('running', 'succeeded', 'failed');

create table public.card_sync_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  provider varchar(80) not null,
  provider_revision varchar(80) not null,
  status public.card_sync_status not null default 'running',
  fetched_count integer not null default 0 check (fetched_count >= 0),
  upserted_count integer not null default 0 check (upserted_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (
    (status = 'running' and finished_at is null)
    or (status in ('succeeded', 'failed') and finished_at is not null)
  )
);

create index card_sync_runs_started_idx
  on public.card_sync_runs (started_at desc);

alter table public.card_sync_runs enable row level security;

create policy "moderators read card sync runs"
on public.card_sync_runs for select
to authenticated
using (public.is_moderator());

grant select on public.card_sync_runs to authenticated;
