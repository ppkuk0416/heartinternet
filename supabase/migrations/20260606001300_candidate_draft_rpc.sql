alter table public.deck_candidates
  add constraint deck_candidates_drafted_deck_shape check (
    status <> 'drafted'
    or (
      matched_deck_id is not null
      and reviewed_by is not null
      and reviewed_at is not null
    )
  );

create or replace function public.create_deck_candidate_draft(
  target_candidate_id uuid,
  p_title text,
  p_summary text,
  p_recommended_for text,
  p_difficulty public.deck_difficulty,
  p_game_plan text,
  p_mulligan_guide text,
  p_card_choices text,
  p_matchup_notes text,
  p_parser_version text,
  p_class_slug text,
  p_hero_dbf_id integer,
  p_cards jsonb
)
returns table (deck_id uuid, deck_slug text, deck_status public.deck_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  candidate public.deck_candidates;
  source public.deck_tracking_sources;
  target_class_id smallint;
  target_patch_id uuid;
  new_deck_id uuid;
  new_code_id uuid;
  new_slug text;
  expected_rows integer;
  inserted_rows integer;
  main_card_count integer;
begin
  if owner_id is null or not public.is_moderator() then
    raise exception 'Moderator access is required';
  end if;
  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Cards must be a JSON array';
  end if;

  select * into candidate
  from public.deck_candidates
  where id = target_candidate_id
  for update;

  if not found then
    raise exception 'Candidate not found';
  end if;
  if candidate.status <> 'approved'
     or candidate.code_validation_status <> 'valid'
     or candidate.raw_deck_code is null
     or candidate.code_hash is null then
    raise exception 'Only an approved candidate with a validated code may create a draft';
  end if;

  select * into source
  from public.deck_tracking_sources
  where id = candidate.source_id;

  if char_length(btrim(p_title)) not between 3 and 120
     or char_length(btrim(p_summary)) not between 20 and 320 then
    raise exception 'Draft title or summary is invalid';
  end if;

  select id into target_class_id
  from public.hearthstone_classes
  where slug = p_class_slug and is_active;
  if target_class_id is null or target_class_id is distinct from candidate.class_id then
    raise exception 'Candidate class does not match the validated deck';
  end if;

  select id into target_patch_id
  from public.patches
  where is_current;
  if target_patch_id is null or target_patch_id is distinct from candidate.patch_id then
    raise exception 'Candidate patch is not current';
  end if;

  select
    count(*)::integer,
    coalesce(sum(quantity) filter (where owner_dbf_id is null), 0)::integer
  into expected_rows, main_card_count
  from jsonb_to_recordset(p_cards)
    as card(dbf_id integer, quantity integer, owner_dbf_id integer);
  if main_card_count <> 30 then
    raise exception 'A Standard deck must contain 30 main-deck cards';
  end if;

  if not exists (
    select 1 from public.cards
    where dbf_id = p_hero_dbf_id
      and card_type = 'HERO'
      and is_active
      and (
        class_id = target_class_id
        or exists (
          select 1 from public.card_classes
          where card_classes.card_id = cards.id
            and card_classes.class_id = target_class_id
        )
      )
  ) then
    raise exception 'Hero does not match the candidate class';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_cards)
      as input(dbf_id integer, quantity integer, owner_dbf_id integer)
    where not exists (
      select 1 from public.cards
      where cards.dbf_id = input.dbf_id
        and cards.is_active
        and cards.is_standard_legal
        and cards.is_collectible
    )
    or (
      input.owner_dbf_id is not null
      and not exists (
        select 1 from public.cards
        where cards.dbf_id = input.owner_dbf_id and cards.is_active
      )
    )
  ) then
    raise exception 'One or more cards are not publishable from the synced catalog';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_cards)
      as input(dbf_id integer, quantity integer, owner_dbf_id integer)
    join public.cards card on card.dbf_id = input.dbf_id
    where not (
      card.class_id = target_class_id
      or exists (
        select 1 from public.card_classes
        where card_classes.card_id = card.id
          and card_classes.class_id = target_class_id
      )
      or (
        card.class_id is null
        and not exists (
          select 1 from public.card_classes
          where card_classes.card_id = card.id
        )
      )
    )
  ) then
    raise exception 'One or more cards do not match the candidate class';
  end if;

  if exists (
    select 1
    from public.deck_codes existing_code
    where existing_code.code_hash = candidate.code_hash
      and existing_code.deck_id in (
        select existing_deck.id from public.decks existing_deck
        where existing_deck.status in ('draft', 'pending', 'published')
          and existing_deck.deleted_at is null
      )
  ) then
    raise exception 'A current deck already uses this code';
  end if;

  new_slug := 'draft-' || left(replace(extensions.gen_random_uuid()::text, '-', ''), 20);

  insert into public.decks (
    slug, author_id, title, class_id, format, summary, recommended_for,
    difficulty, game_plan, mulligan_guide, card_choices, matchup_notes,
    status, verification_status
  ) values (
    new_slug, owner_id, btrim(p_title), target_class_id, 'standard',
    btrim(p_summary), btrim(p_recommended_for), p_difficulty,
    btrim(p_game_plan), btrim(p_mulligan_guide),
    nullif(btrim(p_card_choices), ''), nullif(btrim(p_matchup_notes), ''),
    'draft', 'source_checked'
  )
  returning id into new_deck_id;

  insert into public.deck_codes (
    deck_id, raw_code, code_hash, version_number, patch_id, format,
    class_id, hero_dbf_id, card_count, parse_status, parser_version, created_by
  ) values (
    new_deck_id, candidate.raw_deck_code, candidate.code_hash, 1,
    target_patch_id, 'standard', target_class_id, p_hero_dbf_id, 30,
    'valid', p_parser_version, owner_id
  )
  returning id into new_code_id;

  insert into public.deck_cards (
    deck_code_id, card_id, quantity, sideboard_for_card_id, sort_order
  )
  select
    new_code_id, card.id, input.quantity, owner_card.id, input.ordinality - 1
  from rows from (
    jsonb_to_recordset(p_cards)
      as (dbf_id integer, quantity integer, owner_dbf_id integer)
  ) with ordinality
    as input(dbf_id, quantity, owner_dbf_id, ordinality)
  join public.cards card on card.dbf_id = input.dbf_id and card.is_active
  left join public.cards owner_card
    on owner_card.dbf_id = input.owner_dbf_id and owner_card.is_active;

  get diagnostics inserted_rows = row_count;
  if inserted_rows <> expected_rows then
    raise exception 'One or more cards are missing from the synced catalog';
  end if;

  insert into public.source_evidence (
    deck_id, source_type, source_url, source_name, claimed_rank, wins, losses,
    played_from, played_to, evidence_status, evidence_note
  ) values (
    new_deck_id, source.source_type, candidate.source_url, source.name,
    nullif(btrim(candidate.claimed_rank), ''), candidate.wins, candidate.losses,
    candidate.source_published_at::date, candidate.source_published_at::date,
    'source_linked',
    nullif(btrim(concat_ws(' · ', candidate.player_name, candidate.event_name)), '')
  );

  update public.decks
  set current_deck_code_id = new_code_id
  where id = new_deck_id;

  update public.deck_candidates
  set
    status = 'drafted',
    matched_deck_id = new_deck_id,
    review_note = concat_ws(
      E'\n',
      nullif(review_note, ''),
      'Curated draft created by ' || owner_id::text
    )
  where id = candidate.id;

  insert into public.moderation_audits (
    actor_id, action, target_type, target_id, before_state, after_state, reason
  ) values (
    owner_id, 'create_candidate_draft', 'deck_candidate', candidate.id,
    to_jsonb(candidate),
    (select to_jsonb(updated) from public.deck_candidates updated where updated.id = candidate.id),
    'Approved candidate converted to curated deck draft'
  );

  return query select new_deck_id, new_slug, 'draft'::public.deck_status;
end;
$$;

create or replace function public.publish_deck_draft(p_deck_id uuid)
returns table (deck_slug text, deck_status public.deck_status)
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  target_deck public.decks;
  target_code public.deck_codes;
  main_card_count integer;
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  select * into target_deck
  from public.decks
  where id = p_deck_id
  for update;

  if not found or target_deck.author_id <> owner_id then
    raise exception 'Deck not found';
  end if;
  if target_deck.status <> 'draft' then
    raise exception 'Only a draft can be published';
  end if;
  if char_length(btrim(target_deck.summary)) not between 20 and 320
     or char_length(btrim(target_deck.recommended_for)) < 3
     or char_length(btrim(target_deck.game_plan)) < 20
     or char_length(btrim(target_deck.mulligan_guide)) < 10 then
    raise exception 'Submission guide is incomplete';
  end if;

  select * into target_code
  from public.deck_codes
  where id = target_deck.current_deck_code_id;
  if not found
     or target_code.deck_id <> target_deck.id
     or target_code.format <> 'standard'
     or target_code.parse_status <> 'valid'
     or not exists (
       select 1 from public.patches
       where id = target_code.patch_id and is_current
     ) then
    raise exception 'Deck code is not current and publishable';
  end if;

  select coalesce(sum(quantity), 0)::integer into main_card_count
  from public.deck_cards
  where deck_code_id = target_code.id
    and sideboard_for_card_id is null;
  if main_card_count <> 30
     or exists (
       select 1
       from public.deck_cards dc
       join public.cards c on c.id = dc.card_id
       where dc.deck_code_id = target_code.id
         and (not c.is_active or not c.is_standard_legal or not c.is_collectible)
     ) then
    raise exception 'Deck cards are not publishable';
  end if;
  if not exists (
    select 1 from public.source_evidence
    where deck_id = target_deck.id
      and evidence_status in ('self_reported', 'source_linked', 'reviewed')
  ) then
    raise exception 'Source evidence is required';
  end if;

  update public.decks
  set status = 'published', published_at = now()
  where id = target_deck.id;

  update public.deck_candidates
  set status = 'linked'
  where matched_deck_id = target_deck.id
    and status = 'drafted';

  if found then
    perform public.refresh_deck_trend_signal(target_deck.id);
  end if;

  return query select target_deck.slug::text, 'published'::public.deck_status;
end;
$$;

revoke all on function public.create_deck_candidate_draft(
  uuid, text, text, text, public.deck_difficulty, text, text, text, text,
  text, text, integer, jsonb
) from public;
grant execute on function public.create_deck_candidate_draft(
  uuid, text, text, text, public.deck_difficulty, text, text, text, text,
  text, text, integer, jsonb
) to authenticated;

revoke all on function public.publish_deck_draft(uuid) from public, anon;
grant execute on function public.publish_deck_draft(uuid) to authenticated;
