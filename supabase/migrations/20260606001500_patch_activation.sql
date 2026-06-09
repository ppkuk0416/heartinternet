create table public.patch_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  previous_patch_id uuid references public.patches(id) on delete restrict,
  next_patch_id uuid not null references public.patches(id) on delete restrict,
  stale_candidate_count integer not null default 0,
  refreshed_deck_count integer not null default 0,
  requires_card_review boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.patch_transitions enable row level security;

create policy "moderators read patch transitions"
on public.patch_transitions for select
using (public.is_moderator());

create or replace function public.compare_patch_versions(
  left_version text,
  right_version text
)
returns integer
language sql
immutable
set search_path = ''
as $$
  select sign(
    (
      split_part(left_version, '.', 1)::bigint * 1000000000
      + split_part(left_version, '.', 2)::bigint * 1000000
      + coalesce(nullif(split_part(left_version, '.', 3), '')::bigint, 0)
    )
    -
    (
      split_part(right_version, '.', 1)::bigint * 1000000000
      + split_part(right_version, '.', 2)::bigint * 1000000
      + coalesce(nullif(split_part(right_version, '.', 3), '')::bigint, 0)
    )
  )::integer
$$;

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
      coalesce(max(candidate.priority_score), 0)
      + least(greatest(count(distinct candidate.source_id)::integer - 1, 0) * 8, 16)
      + least(coalesce(sum(candidate.observed_count), 0)::integer, 10)
    ),
    count(distinct candidate.source_id)::integer,
    max(candidate.last_seen_at)
  into new_score, new_source_count, newest_observation
  from public.deck_candidates candidate
  join public.patches patch on patch.id = candidate.patch_id and patch.is_current
  where candidate.matched_deck_id = target_deck_id
    and candidate.status = 'linked'
    and candidate.last_seen_at >= now() - interval '14 days';

  perform set_config('app.internal_counter_update', 'true', true);
  update public.decks
  set
    trend_score = coalesce(new_score, 0),
    tracking_source_count = coalesce(new_source_count, 0),
    last_tracked_at = newest_observation
  where id = target_deck_id;
end;
$$;

create or replace function public.activate_hearthstone_patch(
  p_version text,
  p_released_at timestamptz,
  p_notes_url text,
  p_requires_card_review boolean default false
)
returns table (
  previous_version text,
  current_version text,
  stale_candidate_count integer,
  refreshed_deck_count integer,
  requires_card_review boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_patch public.patches;
  next_patch public.patches;
  stale_count integer := 0;
  refresh_count integer := 0;
  deck record;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role is required';
  end if;
  if p_version !~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'
     or p_released_at > now() + interval '7 days'
     or p_notes_url !~ '^https://(news|hearthstone)\.blizzard\.com/' then
    raise exception 'Patch metadata is invalid';
  end if;

  select * into previous_patch
  from public.patches
  where is_current
  for update;

  if not found then
    raise exception 'Current patch is not configured';
  end if;
  if public.compare_patch_versions(p_version, previous_patch.version) = 0 then
    return query
      select previous_patch.version::text, previous_patch.version::text, 0, 0,
        p_requires_card_review;
    return;
  end if;
  if public.compare_patch_versions(p_version, previous_patch.version) < 0
     or p_released_at < previous_patch.released_at then
    raise exception 'Patch activation must move forward';
  end if;

  update public.patches
  set
    is_current = false,
    ended_at = greatest(p_released_at, released_at)
  where is_current;

  insert into public.patches (version, released_at, is_current, notes_url)
  values (p_version, p_released_at, true, p_notes_url)
  on conflict (version) do update set
    released_at = excluded.released_at,
    ended_at = null,
    is_current = true,
    notes_url = excluded.notes_url
  returning * into next_patch;

  update public.deck_candidates
  set status = 'stale'
  where patch_id is distinct from next_patch.id
    and status in (
      'discovered', 'needs_code', 'needs_validation', 'ready_for_review',
      'reviewing', 'approved', 'drafted'
    );
  get diagnostics stale_count = row_count;

  update public.deck_candidates
  set last_seen_at = last_seen_at
  where patch_id = next_patch.id
    and status in ('discovered', 'needs_code', 'needs_validation', 'ready_for_review');

  for deck in
    select distinct matched_deck_id as id
    from public.deck_candidates
    where matched_deck_id is not null
  loop
    perform public.refresh_deck_trend_signal(deck.id);
    refresh_count := refresh_count + 1;
  end loop;

  insert into public.patch_transitions (
    previous_patch_id, next_patch_id, stale_candidate_count,
    refreshed_deck_count, requires_card_review
  ) values (
    previous_patch.id, next_patch.id, stale_count, refresh_count,
    p_requires_card_review
  );

  return query
    select previous_patch.version::text, next_patch.version::text, stale_count,
      refresh_count, p_requires_card_review;
end;
$$;

revoke all on function public.activate_hearthstone_patch(
  text, timestamptz, text, boolean
) from public, anon, authenticated;
grant execute on function public.activate_hearthstone_patch(
  text, timestamptz, text, boolean
) to service_role;

grant select on public.patch_transitions to authenticated;
