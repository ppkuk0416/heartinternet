create type public.deck_tracking_ingestion_mode as enum (
  'manual',
  'json_feed',
  'api',
  'webhook'
);
create type public.deck_tracking_run_status as enum (
  'running',
  'succeeded',
  'partial',
  'failed'
);
create type public.deck_candidate_status as enum (
  'discovered',
  'needs_code',
  'ready_for_review',
  'reviewing',
  'approved',
  'linked',
  'duplicate',
  'rejected',
  'stale',
  'failed'
);

create table public.deck_tracking_sources (
  id uuid primary key default extensions.gen_random_uuid(),
  slug varchar(80) not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  name varchar(120) not null,
  source_type public.source_type not null,
  homepage_url text not null,
  ingestion_mode public.deck_tracking_ingestion_mode not null default 'manual',
  trust_tier smallint not null default 1 check (trust_tier between 1 and 3),
  poll_interval_minutes integer not null default 360
    check (poll_interval_minutes between 15 and 10080),
  is_active boolean not null default true,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deck_tracking_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  source_id uuid not null references public.deck_tracking_sources(id) on delete restrict,
  status public.deck_tracking_run_status not null default 'running',
  provider_revision varchar(160),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  inserted_count integer not null default 0 check (inserted_count >= 0),
  updated_count integer not null default 0 check (updated_count >= 0),
  warning_count integer not null default 0 check (warning_count >= 0),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  check (
    (status = 'running' and finished_at is null)
    or (status <> 'running' and finished_at is not null)
  )
);

alter table public.decks
  add column trend_score smallint not null default 0
    check (trend_score between 0 and 100),
  add column tracking_source_count integer not null default 0
    check (tracking_source_count >= 0),
  add column last_tracked_at timestamptz;

create table public.deck_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  source_id uuid not null references public.deck_tracking_sources(id) on delete restrict,
  fingerprint char(64) not null,
  cluster_key char(64) not null,
  external_id varchar(200),
  source_url text not null,
  source_published_at timestamptz,
  title varchar(160),
  player_name varchar(120),
  event_name varchar(160),
  claimed_rank varchar(80),
  raw_deck_code text,
  code_hash char(64),
  class_id smallint references public.hearthstone_classes(id) on delete restrict,
  patch_id uuid references public.patches(id) on delete restrict,
  format public.deck_format not null default 'standard',
  wins integer check (wins is null or wins >= 0),
  losses integer check (losses is null or losses >= 0),
  status public.deck_candidate_status not null default 'discovered',
  priority_score smallint not null default 0 check (priority_score between 0 and 100),
  observed_count integer not null default 1 check (observed_count > 0),
  matched_deck_id uuid references public.decks(id) on delete set null,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, fingerprint),
  check ((wins is null) = (losses is null)),
  check (last_seen_at >= first_seen_at),
  check (status <> 'linked' or matched_deck_id is not null),
  check (
    status not in ('approved', 'linked', 'duplicate', 'rejected')
    or (reviewed_by is not null and reviewed_at is not null)
  )
);

create table public.deck_candidate_observations (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references public.deck_candidates(id) on delete cascade,
  run_id uuid not null references public.deck_tracking_runs(id) on delete cascade,
  payload_hash char(64) not null,
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (candidate_id, run_id, payload_hash)
);

create index deck_tracking_sources_due_idx
  on public.deck_tracking_sources (last_success_at, poll_interval_minutes)
  where is_active;
create index deck_tracking_runs_source_idx
  on public.deck_tracking_runs (source_id, started_at desc);
create index deck_candidates_review_queue_idx
  on public.deck_candidates (status, priority_score desc, last_seen_at desc)
  where status in ('discovered', 'needs_code', 'ready_for_review', 'reviewing');
create index deck_candidates_cluster_idx
  on public.deck_candidates (cluster_key, last_seen_at desc);
create index deck_candidates_matched_deck_idx
  on public.deck_candidates (matched_deck_id, last_seen_at desc)
  where matched_deck_id is not null;
create index deck_candidate_observations_candidate_idx
  on public.deck_candidate_observations (candidate_id, observed_at desc);

create trigger deck_tracking_sources_set_updated_at
before update on public.deck_tracking_sources
for each row execute function public.set_updated_at();
create trigger deck_candidates_set_updated_at
before update on public.deck_candidates
for each row execute function public.set_updated_at();

create or replace function public.calculate_deck_candidate_priority(
  source_trust_tier smallint,
  age_hours integer,
  candidate_observed_count integer,
  has_deck_code boolean,
  is_current_patch boolean,
  has_performance_record boolean
)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select least(
    100,
    greatest(0, source_trust_tier) * 12
    + case
        when age_hours <= 24 then 30
        when age_hours <= 72 then 22
        when age_hours <= 168 then 14
        when age_hours <= 720 then 5
        else 0
      end
    + least(greatest(candidate_observed_count - 1, 0) * 3, 15)
    + case when has_deck_code then 8 else 0 end
    + case when is_current_patch then 20 else 0 end
    + case when has_performance_record then 6 else 0 end
  )::smallint
$$;

create or replace function public.set_deck_candidate_priority()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_trust smallint;
  candidate_is_current boolean;
  age_in_hours integer;
begin
  select trust_tier into source_trust
  from public.deck_tracking_sources
  where id = new.source_id;

  select coalesce(is_current, false) into candidate_is_current
  from public.patches
  where id = new.patch_id;

  age_in_hours := greatest(
    0,
    floor(
      extract(epoch from (now() - coalesce(new.source_published_at, new.last_seen_at)))
      / 3600
    )::integer
  );

  new.priority_score := public.calculate_deck_candidate_priority(
    coalesce(source_trust, 1)::smallint,
    age_in_hours,
    new.observed_count,
    new.raw_deck_code is not null,
    coalesce(candidate_is_current, false),
    new.wins is not null
  );

  if new.status = 'discovered' then
    new.status := case
      when new.raw_deck_code is null then 'needs_code'
      else 'ready_for_review'
    end;
  end if;

  return new;
end;
$$;

create trigger deck_candidates_set_priority
before insert or update of source_id, source_published_at, observed_count,
  raw_deck_code, patch_id, wins, losses, last_seen_at, status
on public.deck_candidates
for each row execute function public.set_deck_candidate_priority();

create or replace function public.refresh_deck_trend_signal(target_deck_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_score integer;
  new_source_count integer;
  newest_observation timestamptz;
begin
  select
    least(
      100,
      coalesce(max(priority_score), 0)
      + least(greatest(count(distinct source_id)::integer - 1, 0) * 8, 16)
      + least(coalesce(sum(observed_count), 0)::integer, 10)
    ),
    count(distinct source_id)::integer,
    max(last_seen_at)
  into new_score, new_source_count, newest_observation
  from public.deck_candidates
  where matched_deck_id = target_deck_id
    and status = 'linked'
    and last_seen_at >= now() - interval '14 days';

  perform set_config('app.internal_counter_update', 'true', true);
  update public.decks
  set
    trend_score = coalesce(new_score, 0),
    tracking_source_count = coalesce(new_source_count, 0),
    last_tracked_at = newest_observation
  where id = target_deck_id;
end;
$$;

create or replace function public.review_deck_candidate(
  target_candidate_id uuid,
  decision public.deck_candidate_status,
  target_deck_id uuid default null,
  decision_note text default null
)
returns public.deck_candidates
language plpgsql
security definer
set search_path = ''
as $$
declare
  before_row public.deck_candidates;
  after_row public.deck_candidates;
begin
  if not public.is_moderator() then
    raise exception 'Moderator access is required';
  end if;
  if decision not in ('approved', 'linked', 'duplicate', 'rejected') then
    raise exception 'Invalid candidate review decision';
  end if;
  if decision = 'linked' and target_deck_id is null then
    raise exception 'Linked candidates require a target deck';
  end if;

  select * into before_row
  from public.deck_candidates
  where id = target_candidate_id
  for update;
  if not found then
    raise exception 'Candidate not found';
  end if;

  update public.deck_candidates
  set
    status = decision,
    matched_deck_id = case when decision = 'linked' then target_deck_id else null end,
    review_note = nullif(btrim(decision_note), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = target_candidate_id
  returning * into after_row;

  insert into public.moderation_audits (
    actor_id, action, target_type, target_id,
    before_state, after_state, reason
  ) values (
    auth.uid(), 'review_deck_candidate', 'deck_candidate', target_candidate_id,
    to_jsonb(before_row), to_jsonb(after_row),
    coalesce(nullif(btrim(decision_note), ''), decision::text)
  );

  if before_row.matched_deck_id is not null then
    perform public.refresh_deck_trend_signal(before_row.matched_deck_id);
  end if;
  if after_row.matched_deck_id is not null then
    perform public.refresh_deck_trend_signal(after_row.matched_deck_id);
  end if;

  return after_row;
end;
$$;

create or replace function public.protect_deck_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.internal_counter_update', true), 'false') <> 'true'
     and not public.is_moderator() then
    if new.author_id is distinct from old.author_id
       or new.verification_status is distinct from old.verification_status
       or new.view_count is distinct from old.view_count
       or new.copy_count is distinct from old.copy_count
       or new.recommendation_count is distinct from old.recommendation_count
       or new.favorite_count is distinct from old.favorite_count
       or new.comment_count is distinct from old.comment_count
       or new.trend_score is distinct from old.trend_score
       or new.tracking_source_count is distinct from old.tracking_source_count
       or new.last_tracked_at is distinct from old.last_tracked_at
       or new.status in ('hidden', 'rejected', 'archived') then
      raise exception 'Attempted update of privileged deck fields';
    end if;
  end if;
  new.last_content_update_at := now();
  return new;
end;
$$;

alter table public.deck_tracking_sources enable row level security;
alter table public.deck_tracking_runs enable row level security;
alter table public.deck_candidates enable row level security;
alter table public.deck_candidate_observations enable row level security;

create policy "moderators read tracking sources"
on public.deck_tracking_sources for select
to authenticated using (public.is_moderator());
create policy "moderators read tracking runs"
on public.deck_tracking_runs for select
to authenticated using (public.is_moderator());
create policy "moderators read deck candidates"
on public.deck_candidates for select
to authenticated using (public.is_moderator());
create policy "moderators read candidate observations"
on public.deck_candidate_observations for select
to authenticated using (public.is_moderator());

grant select on public.deck_tracking_sources, public.deck_tracking_runs,
  public.deck_candidates, public.deck_candidate_observations
to authenticated;
grant all on public.deck_tracking_sources, public.deck_tracking_runs,
  public.deck_candidates, public.deck_candidate_observations
to service_role;
grant usage, select on sequence public.deck_candidate_observations_id_seq
to service_role;

revoke all on function public.calculate_deck_candidate_priority(
  smallint, integer, integer, boolean, boolean, boolean
) from public;
revoke all on function public.refresh_deck_trend_signal(uuid) from public;
revoke all on function public.review_deck_candidate(
  uuid, public.deck_candidate_status, uuid, text
) from public;
grant execute on function public.calculate_deck_candidate_priority(
  smallint, integer, integer, boolean, boolean, boolean
) to service_role;
grant execute on function public.refresh_deck_trend_signal(uuid) to service_role;
grant execute on function public.review_deck_candidate(
  uuid, public.deck_candidate_status, uuid, text
) to authenticated;
