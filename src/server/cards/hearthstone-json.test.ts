// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { fetchHearthstoneJsonCards } from "@/server/cards/hearthstone-json";
import { buildCardSyncPlan } from "@/server/cards/sync-plan";
import type { StandardLegalityConfig } from "@/server/cards/types";

const legality: StandardLegalityConfig = {
  verifiedAt: "2026-06-06",
  standardSetSlugs: ["CORE", "CURRENT_SET"],
  standardLegalCardIds: ["EARLY_CARD"],
  pendingSetSlugs: ["FUTURE_SET"],
  sources: ["https://example.com"],
  note: "test",
};

describe("HearthstoneJSON adapter", () => {
  it("merges Korean localization and applies reviewed Standard legality", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse(
          [
            card({ id: "CARD_1", dbfId: 1, set: "CURRENT_SET" }),
            card({
              id: "EARLY_CARD",
              dbfId: 2,
              set: "FUTURE_SET",
              rarity: "LEGENDARY",
            }),
            card({
              id: "HERO_01",
              dbfId: 7,
              set: "HERO_SKINS",
              type: "HERO",
              collectible: true,
            }),
          ],
          "https://api.hearthstonejson.com/v1/243002/enUS/cards.collectible.json",
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          [
            card({ id: "CARD_1", dbfId: 1, name: "한국어 카드" }),
            card({ id: "EARLY_CARD", dbfId: 2, name: "사전 공개 카드" }),
            card({
              id: "HERO_01",
              dbfId: 7,
              name: "가로쉬",
              type: "HERO",
            }),
          ],
          "https://api.hearthstonejson.com/v1/243002/koKR/cards.collectible.json",
        ),
      );

    const result = await fetchHearthstoneJsonCards({
      legality,
      fetchImpl,
    });

    expect(result.revision).toBe("243002");
    expect(result.warnings).toEqual([]);
    expect(result.cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: "CARD_1",
          nameKo: "한국어 카드",
          classSlug: "warrior",
          isStandardLegal: true,
        }),
        expect.objectContaining({
          cardId: "EARLY_CARD",
          isStandardLegal: true,
          isLegendary: true,
          craftingCost: 1600,
        }),
        expect.objectContaining({
          cardId: "HERO_01",
          cardType: "HERO",
          imageUrlKo: null,
          isStandardLegal: true,
        }),
      ]),
    );
  });

  it("keeps missing Korean localization as a warning instead of dropping a card", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse([card({ id: "CARD_1", dbfId: 1 })], "enUS"),
      )
      .mockResolvedValueOnce(jsonResponse([], "koKR"));

    const result = await fetchHearthstoneJsonCards({
      legality,
      fetchImpl,
    });

    expect(result.cards[0].nameKo).toBe("English Card");
    expect(result.warnings).toEqual([
      "Missing koKR localization for CARD_1",
    ]);
  });

  it("fails the staged import on duplicate stable identifiers", async () => {
    const duplicated = [
      card({ id: "CARD_1", dbfId: 1 }),
      card({ id: "CARD_2", dbfId: 1 }),
    ];
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(duplicated, "enUS"))
      .mockResolvedValueOnce(jsonResponse(duplicated, "koKR"));

    await expect(
      fetchHearthstoneJsonCards({ legality, fetchImpl }),
    ).rejects.toThrow("identity collision");
  });
});

describe("card sync plan", () => {
  it("never interprets a missing provider row as a deletion", () => {
    const incoming = [
      {
        dbfId: 1,
        cardId: "CARD_1",
        nameKo: "카드",
        nameEn: "Card",
        classSlug: null,
        classSlugs: [],
        cardType: "MINION",
        manaCost: 1,
        rarity: "COMMON",
        setSlug: "CORE",
        craftingCost: 40,
        imageUrlKo: null,
        isCollectible: true,
        isStandardLegal: true,
        isLegendary: false,
        isActive: true,
      },
    ];

    const plan = buildCardSyncPlan(incoming, [
      { dbfId: 1, cardId: "CARD_1" },
      { dbfId: 2, cardId: "CARD_2" },
    ]);

    expect(plan.upserts).toEqual(incoming);
    expect(plan.unchangedCount).toBe(1);
    expect(plan.missingExistingDbfIds).toEqual([2]);
  });
});

function card(
  overrides: Partial<{
    id: string;
    dbfId: number;
    name: string;
    type: string;
    set: string;
    collectible: boolean;
    rarity: string;
  }> = {},
) {
  return {
    id: "CARD_1",
    dbfId: 1,
    name: "English Card",
    type: "MINION",
    set: "CURRENT_SET",
    collectible: true,
    rarity: "COMMON",
    cost: 3,
    cardClass: "WARRIOR",
    ...overrides,
  };
}

function jsonResponse(payload: unknown, url = "https://example.com") {
  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
  Object.defineProperty(response, "url", { value: url });
  return response;
}
