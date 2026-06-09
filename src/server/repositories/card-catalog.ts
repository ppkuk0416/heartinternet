import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLiveCardCatalog } from "@/server/cards/live-catalog";
import { InMemoryCardCatalog } from "@/server/deckstrings/catalog";
import type { CardReference } from "@/server/deckstrings/types";

export type ResolvedCardCatalog = {
  catalog: InMemoryCardCatalog;
  source: "supabase" | "hearthstonejson";
  revision: string;
  warnings: string[];
};

type CardRow = {
  id: string;
  dbf_id: number;
  card_id: string;
  name_ko: string;
  name_en: string;
  card_type: string;
  mana_cost: number;
  is_collectible: boolean;
  is_standard_legal: boolean;
  is_legendary: boolean;
  hearthstone_classes: { slug: string } | null;
};

type CardClassRow = {
  card_id: string;
  hearthstone_classes: { slug: string } | null;
};

export async function resolveCardCatalog(
  dbfIds: number[],
): Promise<ResolvedCardCatalog> {
  const uniqueIds = [...new Set(dbfIds)];
  const client = await createServerSupabaseClient();

  if (client && uniqueIds.length > 0) {
    const { data: cards, error: cardsError } = await client
      .from("cards")
      .select(
        "id,dbf_id,card_id,name_ko,name_en,card_type,mana_cost,is_collectible,is_standard_legal,is_legendary,hearthstone_classes(slug)",
      )
      .in("dbf_id", uniqueIds)
      .eq("is_active", true);

    if (!cardsError && cards) {
      const cardIds = cards.map((card) => card.id);
      const { data: cardClasses, error: classesError } = cardIds.length
        ? await client
            .from("card_classes")
            .select("card_id,hearthstone_classes(slug)")
            .in("card_id", cardIds)
        : { data: [], error: null };

      if (!classesError) {
        return {
          catalog: new InMemoryCardCatalog(
            mapSupabaseCards(
              cards as unknown as CardRow[],
              (cardClasses ?? []) as unknown as CardClassRow[],
            ),
          ),
          source: "supabase",
          revision: "synced-database",
          warnings: [],
        };
      }
    }
  }

  const live = await getLiveCardCatalog();
  return {
    ...live,
    source: "hearthstonejson",
    warnings: client
      ? ["동기화 DB 조회에 실패해 실시간 카드 데이터로 검증했습니다.", ...live.warnings]
      : live.warnings,
  };
}

function mapSupabaseCards(cards: CardRow[], cardClasses: CardClassRow[]) {
  const classesByCard = new Map<string, Set<string>>();
  for (const row of cardClasses) {
    const slug = row.hearthstone_classes?.slug;
    if (!slug) continue;
    const slugs = classesByCard.get(row.card_id) ?? new Set<string>();
    slugs.add(slug);
    classesByCard.set(row.card_id, slugs);
  }

  return cards.map<CardReference>((card) => ({
    dbfId: card.dbf_id,
    cardId: card.card_id,
    nameKo: card.name_ko,
    nameEn: card.name_en,
    type: card.card_type === "HERO" ? "hero" : "card",
    classSlugs: [
      ...(card.hearthstone_classes?.slug
        ? [card.hearthstone_classes.slug]
        : []),
      ...(classesByCard.get(card.id) ?? []),
    ],
    manaCost: card.mana_cost,
    collectible: card.is_collectible,
    standardLegal: card.is_standard_legal,
    legendary: card.is_legendary,
  }));
}
