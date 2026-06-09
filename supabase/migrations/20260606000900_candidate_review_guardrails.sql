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
    'ready_for_review',
    'reviewing'
  ) then
    raise exception 'Candidate has already been reviewed';
  end if;

  if decision in ('approved', 'linked')
     and before_row.raw_deck_code is null then
    raise exception 'Approved or linked candidates require a validated deck code';
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
