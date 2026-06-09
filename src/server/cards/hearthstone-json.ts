import { z } from "zod";
import type {
  CardProviderResult,
  StandardLegalityConfig,
  SyncedCardRecord,
} from "@/server/cards/types";

const HearthstoneJsonCardSchema = z
  .object({
    id: z.string().min(1),
    dbfId: z.number().int().positive(),
    name: z.string().min(1),
    type: z.string().min(1),
    cardClass: z.string().optional(),
    classes: z.array(z.string()).optional(),
    collectible: z.boolean().optional(),
    cost: z.number().int().nonnegative().optional(),
    rarity: z.string().optional(),
    set: z.string().min(1),
  })
  .passthrough();

const HearthstoneJsonCardsSchema = z.array(HearthstoneJsonCardSchema);
type HearthstoneJsonCard = z.infer<typeof HearthstoneJsonCardSchema>;

const CLASS_SLUGS: Record<string, string> = {
  DEATHKNIGHT: "death-knight",
  DEMONHUNTER: "demon-hunter",
  DRUID: "druid",
  HUNTER: "hunter",
  MAGE: "mage",
  PALADIN: "paladin",
  PRIEST: "priest",
  ROGUE: "rogue",
  SHAMAN: "shaman",
  WARLOCK: "warlock",
  WARRIOR: "warrior",
};

const CRAFTING_COST: Record<string, number> = {
  COMMON: 40,
  RARE: 100,
  EPIC: 400,
  LEGENDARY: 1600,
};

export async function fetchHearthstoneJsonCards({
  legality,
  fetchImpl = fetch,
  baseUrl = "https://api.hearthstonejson.com/v1/latest",
}: {
  legality: StandardLegalityConfig;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}): Promise<CardProviderResult> {
  const [englishResponse, koreanResponse] = await Promise.all([
    fetchImpl(`${baseUrl}/enUS/cards.collectible.json`, {
      headers: { accept: "application/json" },
    }),
    fetchImpl(`${baseUrl}/koKR/cards.collectible.json`, {
      headers: { accept: "application/json" },
    }),
  ]);

  if (!englishResponse.ok || !koreanResponse.ok) {
    throw new Error(
      `HearthstoneJSON fetch failed: enUS=${englishResponse.status}, koKR=${koreanResponse.status}`,
    );
  }

  const [englishCards, koreanCards] = await Promise.all([
    parsePayload(await englishResponse.json(), "enUS"),
    parsePayload(await koreanResponse.json(), "koKR"),
  ]);
  const koreanById = new Map(koreanCards.map((card) => [card.id, card]));
  const warnings: string[] = [];
  const standardSets = new Set(legality.standardSetSlugs);
  const explicitStandardCards = new Set(legality.standardLegalCardIds);

  const cards = englishCards.map<SyncedCardRecord>((englishCard) => {
    const koreanCard = koreanById.get(englishCard.id);
    if (!koreanCard) {
      warnings.push(`Missing koKR localization for ${englishCard.id}`);
    }
    return mapCard(
      englishCard,
      koreanCard,
      standardSets,
      explicitStandardCards,
    );
  });

  const duplicateDbfIds = findDuplicates(cards.map((card) => card.dbfId));
  const duplicateCardIds = findDuplicates(cards.map((card) => card.cardId));
  if (duplicateDbfIds.length > 0 || duplicateCardIds.length > 0) {
    throw new Error(
      `HearthstoneJSON identity collision: dbfIds=${duplicateDbfIds.join(
        ",",
      )}; cardIds=${duplicateCardIds.join(",")}`,
    );
  }

  return {
    provider: "hearthstonejson",
    revision:
      extractRevision(englishResponse.url) ??
      normalizeEtag(englishResponse.headers.get("etag")) ??
      "latest-unknown",
    fetchedAt: new Date().toISOString(),
    cards,
    warnings,
  };
}

function mapCard(
  english: HearthstoneJsonCard,
  korean: HearthstoneJsonCard | undefined,
  standardSets: Set<string>,
  explicitStandardCards: Set<string>,
): SyncedCardRecord {
  const classSlugs = [...new Set([...(english.classes ?? []), english.cardClass])]
    .filter((value): value is string => Boolean(value) && value !== "NEUTRAL")
    .map((value) => CLASS_SLUGS[value])
    .filter((value): value is string => Boolean(value));
  const type = english.type.toUpperCase();
  const rarity = english.rarity?.toUpperCase() ?? null;
  const isCollectible = english.collectible === true;
  const isHero = type === "HERO";

  return {
    dbfId: english.dbfId,
    cardId: english.id,
    nameKo: korean?.name ?? english.name,
    nameEn: english.name,
    classSlug: classSlugs.length === 1 ? classSlugs[0] : null,
    classSlugs,
    cardType: type,
    manaCost: english.cost ?? 0,
    rarity,
    setSlug: english.set,
    craftingCost:
      isCollectible && rarity ? (CRAFTING_COST[rarity] ?? null) : null,
    imageUrlKo: isHero
      ? null
      : `https://art.hearthstonejson.com/v1/render/latest/koKR/256x/${english.id}.png`,
    isCollectible,
    isStandardLegal:
      isHero ||
      standardSets.has(english.set) ||
      explicitStandardCards.has(english.id),
    isLegendary: rarity === "LEGENDARY",
    isActive: true,
  };
}

async function parsePayload(payload: unknown, locale: string) {
  const result = HearthstoneJsonCardsSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(
      `Invalid HearthstoneJSON ${locale} payload: ${result.error.issues[0]?.message ?? "unknown error"}`,
    );
  }
  return result.data;
}

function extractRevision(url: string) {
  return url.match(/\/v1\/(\d+)\//)?.[1];
}

function normalizeEtag(etag: string | null) {
  return etag?.replace(/^W\//, "").replaceAll('"', "") || undefined;
}

function findDuplicates(values: Array<number | string>) {
  const seen = new Set<number | string>();
  const duplicates = new Set<number | string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}
