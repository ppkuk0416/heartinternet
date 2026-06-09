alter table public.decks
  alter column summary set default '';

alter table public.decks
  drop constraint if exists decks_summary_check;

alter table public.decks
  add constraint decks_summary_check
  check (
    status <> 'published'
    or char_length(summary) between 20 and 320
  );

create or replace function public.create_deck_draft(
  p_title text,
  p_summary text,
  p_recommended_for text,
  p_difficulty public.deck_difficulty,
  p_game_plan text,
  p_mulligan_guide text,
  p_card_choices text,
  p_matchup_notes text,
  p_raw_code text,
  p_code_hash text,
  p_parser_version text,
  p_class_slug text,
  p_hero_dbf_id integer,
  p_cards jsonb
)
returns table (deck_id uuid, deck_slug text)
language plpgsql
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  target_class_id smallint;
  target_patch_id uuid;
  new_deck_id uuid;
  new_code_id uuid;
  new_slug text;
  expected_rows integer;
  inserted_rows integer;
  main_card_count integer;
begin
  if owner_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(p_cards) <> 'array' then
    raise exception 'Cards must be a JSON array';
  end if;

  select id into target_class_id
  from public.hearthstone_classes
  where slug = p_class_slug and is_active;

  if target_class_id is null then
    raise exception 'Unknown Hearthstone class';
  end if;

  select id into target_patch_id
  from public.patches
  where is_current;

  if target_patch_id is null then
    raise exception 'Current patch is not configured';
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
    select 1
    from public.cards
    where dbf_id = p_hero_dbf_id
      and card_type = 'HERO'
      and is_active
  ) then
    raise exception 'Hero is missing from the synced catalog';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_cards)
      as input(dbf_id integer, quantity integer, owner_dbf_id integer)
    where not exists (
      select 1
      from public.cards
      where cards.dbf_id = input.dbf_id and cards.is_active
    )
    or (
      input.owner_dbf_id is not null
      and not exists (
        select 1
        from public.cards
        where cards.dbf_id = input.owner_dbf_id and cards.is_active
      )
    )
  ) then
    raise exception 'One or more cards are missing from the synced catalog';
  end if;

  new_slug := 'draft-' || left(replace(extensions.gen_random_uuid()::text, '-', ''), 20);

  insert into public.decks (
    slug,
    author_id,
    title,
    class_id,
    format,
    summary,
    recommended_for,
    difficulty,
    game_plan,
    mulligan_guide,
    card_choices,
    matchup_notes,
    status,
    verification_status
  ) values (
    new_slug,
    owner_id,
    p_title,
    target_class_id,
    'standard',
    p_summary,
    p_recommended_for,
    p_difficulty,
    p_game_plan,
    p_mulligan_guide,
    nullif(p_card_choices, ''),
    nullif(p_matchup_notes, ''),
    'draft',
    'unverified'
  )
  returning id into new_deck_id;

  insert into public.deck_codes (
    deck_id,
    raw_code,
    code_hash,
    version_number,
    patch_id,
    format,
    class_id,
    hero_dbf_id,
    card_count,
    parse_status,
    parser_version,
    created_by
  ) values (
    new_deck_id,
    p_raw_code,
    p_code_hash,
    1,
    target_patch_id,
    'standard',
    target_class_id,
    p_hero_dbf_id,
    30,
    'valid',
    p_parser_version,
    owner_id
  )
  returning id into new_code_id;

  insert into public.deck_cards (
    deck_code_id,
    card_id,
    quantity,
    sideboard_for_card_id,
    sort_order
  )
  select
    new_code_id,
    card.id,
    input.quantity,
    owner_card.id,
    input.ordinality - 1
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

  update public.decks
  set current_deck_code_id = new_code_id
  where id = new_deck_id;

  return query select new_deck_id, new_slug;
end;
$$;

revoke all on function public.create_deck_draft(
  text, text, text, public.deck_difficulty, text, text, text, text,
  text, text, text, text, integer, jsonb
) from public, anon;

grant execute on function public.create_deck_draft(
  text, text, text, public.deck_difficulty, text, text, text, text,
  text, text, text, text, integer, jsonb
) to authenticated;
