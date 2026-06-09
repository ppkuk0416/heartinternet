import { fetchHearthstoneJsonCards } from "@/server/cards/hearthstone-json";
import { standardLegalityConfig } from "@/server/cards/standard-config";
import { InMemoryCardCatalog } from "@/server/deckstrings/catalog";
import type { CardReference } from "@/server/deckstrings/types";

const CACHE_TTL_MS = 60 * 60 * 1000;

let cached:
  | {
      expiresAt: number;
      promise: Promise<LiveCatalogResult>;
    }
  | undefined;

export type LiveCatalogResult = {
  catalog: InMemoryCardCatalog;
  revision: string;
  warnings: string[];
};

export function getLiveCardCatalog(): Promise<LiveCatalogResult> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.promise;

  const promise = fetchHearthstoneJsonCards({
    legality: standardLegalityConfig,
  })
    .then((result) => ({
      catalog: new InMemoryCardCatalog(
        result.cards.map<CardReference>((card) => ({
          dbfId: card.dbfId,
          cardId: card.cardId,
          nameKo: card.nameKo,
          nameEn: card.nameEn,
          type: card.cardType === "HERO" ? "hero" : "card",
          classSlugs: card.classSlugs,
          manaCost: card.manaCost,
          collectible: card.isCollectible,
          standardLegal: card.isStandardLegal,
          legendary: card.isLegendary,
        })),
      ),
      revision: result.revision,
      warnings: result.warnings,
    }))
    .catch((error) => {
      cached = undefined;
      throw error;
    });

  cached = { expiresAt: now + CACHE_TTL_MS, promise };
  return promise;
}

export function clearLiveCardCatalogCache() {
  cached = undefined;
}
