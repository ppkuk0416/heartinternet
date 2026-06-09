create or replace function public.publish_deck_draft(p_deck_id uuid)
returns table (deck_slug text, deck_status public.deck_status)
language plpgsql
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

  return query select target_deck.slug::text, 'published'::public.deck_status;
end;
$$;

revoke all on function public.publish_deck_draft(uuid) from public, anon;
grant execute on function public.publish_deck_draft(uuid) to authenticated;
