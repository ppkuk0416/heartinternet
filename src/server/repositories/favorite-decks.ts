import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Deck } from "@/lib/types";
import {
  mapPublishedDeck,
  type PublishedDeckRow,
} from "@/server/repositories/published-deck";

const PAGE_SIZE = 12;

export type FavoriteDecksResult = {
  decks: Deck[];
  total: number;
  page: number;
  pageSize: number;
  unavailable: boolean;
};

export async function getFavoriteDecks({
  userId,
  page,
}: {
  userId: string;
  page: number;
}): Promise<FavoriteDecksResult> {
  const client = await createServerSupabaseClient();
  const requestedPage = Math.max(1, page);
  if (!client) return emptyResult(requestedPage, true);

  const from = (requestedPage - 1) * PAGE_SIZE;
  const { data: favorites, count, error: favoriteError } = await client
    .from("favorites")
    .select("deck_id,created_at", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (favoriteError) return emptyResult(requestedPage, true);

  const total = count ?? 0;
  const resolvedPage =
    total > 0 && from >= total ? 1 : requestedPage;
  if (resolvedPage !== requestedPage) {
    return getFavoriteDecks({ userId, page: resolvedPage });
  }
  if (!favorites || favorites.length === 0) {
    return {
      decks: [],
      total,
      page: resolvedPage,
      pageSize: PAGE_SIZE,
      unavailable: false,
    };
  }

  const deckIds = favorites.map((favorite) => favorite.deck_id);
  const { data: deckRows, error: deckError } = await client
    .from("decks")
    .select(
      `
      id,slug,title,summary,recommended_for,difficulty,strengths,weaknesses,
      game_plan,mulligan_guide,card_choices,matchup_notes,
      recommendation_count,favorite_count,comment_count,copy_count,updated_at,
      hearthstone_classes(name_ko),
      archetypes(name_ko,strategy_type),
      profiles(display_name),
      deck_tags(tags(name_ko)),
      active_code:deck_codes!decks_current_deck_code_fk(
        raw_code,
        patches(version,is_current),
        deck_cards(quantity,sideboard_for_card_id,cards(name_ko,mana_cost,is_legendary))
      ),
      source_evidence(
        source_type,source_url,source_name,claimed_rank,wins,losses,
        evidence_status,evidence_note
      )
      `,
    )
    .in("id", deckIds)
    .eq("status", "published")
    .is("deleted_at", null);
  if (deckError) return emptyResult(resolvedPage, true);

  const rowById = new Map(
    ((deckRows ?? []) as unknown as Array<PublishedDeckRow & { id: string }>).map(
      (row) => [row.id, row],
    ),
  );
  const decks = deckIds.flatMap((id) => {
    const row = rowById.get(id);
    if (!row) return [];
    const deck = mapPublishedDeck(row);
    return deck ? [deck] : [];
  });

  return {
    decks,
    total,
    page: resolvedPage,
    pageSize: PAGE_SIZE,
    unavailable: false,
  };
}

function emptyResult(page: number, unavailable: boolean): FavoriteDecksResult {
  return {
    decks: [],
    total: 0,
    page,
    pageSize: PAGE_SIZE,
    unavailable,
  };
}
