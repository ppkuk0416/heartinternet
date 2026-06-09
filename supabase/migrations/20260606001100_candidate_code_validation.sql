create type public.deck_candidate_code_validation_status as enum (
  'not_supplied',
  'pending',
  'valid',
  'invalid',
  'unavailable'
);

alter table public.deck_candidates
  add column code_validation_status
    public.deck_candidate_code_validation_status not null default 'not_supplied',
  add column code_validation_issues jsonb not null default '[]'::jsonb,
  add column code_validated_at timestamptz;

update public.deck_candidates
set code_validation_status = 'pending'
where raw_deck_code is not null;

alter table public.deck_candidates
  add constraint deck_candidates_code_validation_shape check (
    jsonb_typeof(code_validation_issues) = 'array'
    and (
      (code_validation_status = 'not_supplied' and raw_deck_code is null)
      or (code_validation_status <> 'not_supplied' and raw_deck_code is not null)
    )
    and (
      code_validation_status in ('not_supplied', 'pending')
      or code_validated_at is not null
    )
  );

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
    new.code_validation_status = 'valid',
    coalesce(candidate_is_current, false),
    new.wins is not null
  );

  if new.status in ('discovered', 'needs_code', 'needs_validation', 'ready_for_review') then
    new.status := case
      when new.raw_deck_code is null then 'needs_code'
      when new.code_validation_status = 'valid' then 'ready_for_review'
      else 'needs_validation'
    end;
  end if;

  return new;
end;
$$;

drop trigger deck_candidates_set_priority on public.deck_candidates;
create trigger deck_candidates_set_priority
before insert or update of source_id, source_published_at, observed_count,
  raw_deck_code, patch_id, wins, losses, last_seen_at, status,
  code_validation_status
on public.deck_candidates
for each row execute function public.set_deck_candidate_priority();

update public.deck_candidates
set status = status
where status in ('discovered', 'needs_code', 'needs_validation', 'ready_for_review');

create index deck_candidates_validation_queue_idx
  on public.deck_candidates (code_validation_status, priority_score desc, last_seen_at desc)
  where status = 'needs_validation';

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
  target_is_published boolean;
begin
  if not public.is_moderator() then
    raise exception 'Moderator access is required';
  end if;
  if decision not in ('approved', 'linked', 'duplicate', 'rejected') then
    raise exception 'Invalid candidate review decision';
  end if;

  select * into before_row
  from public.deck_candidates
  where id = target_candidate_id
  for update;
  if not found then
    raise exception 'Candidate not found';
  end if;

  if before_row.status not in (
    'discovered',
    'needs_code',
    'needs_validation',
    'ready_for_review',
    'reviewing'
  ) then
    raise exception 'Candidate has already been reviewed';
  end if;

  if decision in ('approved', 'linked')
     and before_row.code_validation_status <> 'valid' then
    raise exception 'Approved or linked candidates require a fully validated deck code';
  end if;

  if decision = 'linked' then
    if target_deck_id is null then
      raise exception 'Linked candidates require a target deck';
    end if;

    select status = 'published'
      and current_deck_code_id is not null
    into target_is_published
    from public.decks
    where id = target_deck_id;

    if not coalesce(target_is_published, false) then
      raise exception 'Candidates may only link to a published deck';
    end if;
  end if;

  if decision = 'rejected'
     and nullif(btrim(decision_note), '') is null then
    raise exception 'Rejected candidates require a review note';
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

revoke all on function public.review_deck_candidate(
  uuid, public.deck_candidate_status, uuid, text
) from public;
grant execute on function public.review_deck_candidate(
  uuid, public.deck_candidate_status, uuid, text
) to authenticated;
