// @vitest-environment node

import { decode, encode, type DeckDefinition } from "deckstrings";
import { describe, expect, it } from "vitest";
import { decks } from "@/lib/decks";
import {
  decodeDeckstring,
  hashDeckCode,
} from "@/server/deckstrings/adapter";
import { InMemoryCardCatalog } from "@/server/deckstrings/catalog";
import { DeckstringError } from "@/server/deckstrings/errors";
import type { CardReference } from "@/server/deckstrings/types";
import { validateDeckForPublication } from "@/server/deckstrings/validator";

const HERO_ID = 7;
const CARD_IDS = Array.from({ length: 15 }, (_, index) => 1000 + index);

function makeDeck(
  overrides: Partial<DeckDefinition> = {},
): DeckDefinition {
  return {
    format: 2,
    heroes: [HERO_ID],
    cards: CARD_IDS.map((dbfId) => [dbfId, 2]),
    sideboardCards: [],
    ...overrides,
  };
}

function makeCatalog(
  overrides: Partial<Record<number, Partial<CardReference>>> = {},
) {
  const cards: CardReference[] = [
    {
      dbfId: HERO_ID,
      cardId: "HERO_01",
      nameKo: "테스트 전사",
      nameEn: "Test Warrior",
      type: "hero",
      classSlugs: ["warrior"],
      manaCost: 0,
      collectible: false,
      standardLegal: true,
      legendary: false,
    },
    ...CARD_IDS.map<CardReference>((dbfId, index) => ({
      dbfId,
      cardId: `CARD_${dbfId}`,
      nameKo: `테스트 카드 ${index + 1}`,
      nameEn: `Test Card ${index + 1}`,
      type: "card",
      classSlugs: index % 2 === 0 ? [] : ["warrior"],
      manaCost: index % 8,
      collectible: true,
      standardLegal: true,
      legendary: false,
    })),
    {
      dbfId: 2000,
      cardId: "SIDEBOARD_CARD",
      nameKo: "사이드보드 카드",
      nameEn: "Sideboard Card",
      type: "card",
      classSlugs: [],
      manaCost: 3,
      collectible: true,
      standardLegal: true,
      legendary: false,
    },
  ];

  return new InMemoryCardCatalog(
    cards.map((card) => ({ ...card, ...overrides[card.dbfId] })),
  );
}

describe("deckstring adapter", () => {
  it("extracts a code from exported Hearthstone text", () => {
    const code = encode(makeDeck());
    const decoded = decodeDeckstring(
      `### 테스트 덱\n# 직업: 전사\n# 대전 방식: 정규\n#\n${code}\n#`,
    );

    expect(decoded.canonicalCode).toBe(code);
    expect(decoded.format).toBe("standard");
    expect(decoded.cards).toHaveLength(15);
    expect(decoded.codeHash).toHaveLength(64);
  });

  it("produces the same hash for equivalent canonical input", () => {
    const deck = makeDeck({
      cards: [...makeDeck().cards].reverse(),
    });
    const code = encode(deck);
    const decoded = decodeDeckstring(`\n${code}\n`);

    expect(decoded.codeHash).toBe(hashDeckCode(encode(decode(code))));
  });

  it("returns a typed error for malformed input", () => {
    expect(() => decodeDeckstring("not a deck code")).toThrowError(
      DeckstringError,
    );
    try {
      decodeDeckstring("not a deck code");
    } catch (error) {
      expect(error).toMatchObject({ code: "code_not_found" });
    }
  });

  it("decodes every technical-alpha deck as a 30-card Standard deck", () => {
    for (const deck of decks) {
      const decoded = decodeDeckstring(deck.deckCode);
      expect(decoded.format, deck.slug).toBe("standard");
      expect(
        decoded.cards.reduce((sum, card) => sum + card.quantity, 0),
        deck.slug,
      ).toBe(30);
    }
  });
});

describe("publication validation", () => {
  it("accepts a valid 30-card Standard deck", () => {
    const decoded = decodeDeckstring(encode(makeDeck()));
    const result = validateDeckForPublication(decoded, makeCatalog());

    expect(result).toMatchObject({
      decodable: true,
      supported: true,
      publishable: true,
      heroClassSlug: "warrior",
      mainDeckCardCount: 30,
      issues: [],
    });
  });

  it("separates decodable Wild decks from supported decks", () => {
    const decoded = decodeDeckstring(encode(makeDeck({ format: 1 })));
    const result = validateDeckForPublication(decoded, makeCatalog());

    expect(result.decodable).toBe(true);
    expect(result.supported).toBe(false);
    expect(result.publishable).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "unsupported_format" }),
    );
  });

  it("rejects incomplete, unknown, and outdated cards", () => {
    const cards: DeckDefinition["cards"] = [
      ...CARD_IDS.slice(0, 13).map<[number, number]>((id) => [id, 2]),
      [CARD_IDS[13], 1],
      [999999, 1],
    ];
    const decoded = decodeDeckstring(encode(makeDeck({ cards })));
    const result = validateDeckForPublication(
      decoded,
      makeCatalog({
        [CARD_IDS[13]]: { standardLegal: false },
      }),
    );

    expect(result.publishable).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "invalid_card_count",
        "unknown_card",
        "card_not_standard",
      ]),
    );
  });

  it("rejects legendary duplicates and class mismatches", () => {
    const decoded = decodeDeckstring(encode(makeDeck()));
    const result = validateDeckForPublication(
      decoded,
      makeCatalog({
        [CARD_IDS[0]]: { legendary: true },
        [CARD_IDS[1]]: { classSlugs: ["mage"] },
      }),
    );

    expect(result.publishable).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["legendary_quantity", "class_mismatch"]),
    );
  });

  it("validates sideboard ownership without counting sideboard cards as main deck cards", () => {
    const decoded = decodeDeckstring(
      encode(
        makeDeck({
          sideboardCards: [[2000, 1, CARD_IDS[0]]],
        }),
      ),
    );
    const result = validateDeckForPublication(decoded, makeCatalog());

    expect(result.publishable).toBe(true);
    expect(result.mainDeckCardCount).toBe(30);
  });

  it("rejects a sideboard whose owner is not in the deck", () => {
    const decoded = decodeDeckstring(
      encode(
        makeDeck({
          sideboardCards: [[2000, 1, 999998]],
        }),
      ),
    );
    const result = validateDeckForPublication(decoded, makeCatalog());

    expect(result.publishable).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "unknown_sideboard_owner",
        "sideboard_owner_not_in_deck",
      ]),
    );
  });
});
