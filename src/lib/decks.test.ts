import { describe, expect, it } from "vitest";
import {
  CURRENT_PATCH,
  decks,
  getBeginnerDecks,
  getDeck,
  getPopularDecks,
} from "@/lib/decks";

describe("deck catalog", () => {
  it("uses unique slugs and non-empty deck codes", () => {
    const slugs = decks.map((deck) => deck.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(decks.every((deck) => deck.deckCode.length > 20)).toBe(true);
  });

  it("shows only complete 30-card Standard demo decks", () => {
    const incompleteDecks = decks
      .map((deck) => ({
        slug: deck.slug,
        count: deck.cards.reduce((sum, card) => sum + card.quantity, 0),
      }))
      .filter((deck) => deck.count !== 30);

    expect(incompleteDecks).toEqual([]);
  });

  it("keeps current patch metadata consistent", () => {
    const currentDecks = decks.filter(
      (deck) => deck.patchStatus === "현재 패치",
    );

    expect(currentDecks.length).toBeGreaterThan(0);
    expect(currentDecks.every((deck) => deck.patch === CURRENT_PATCH)).toBe(true);
  });

  it("excludes stale decks from popular results", () => {
    expect(
      getPopularDecks().every((deck) => deck.patchStatus === "현재 패치"),
    ).toBe(true);
  });

  it("returns only beginner-tagged decks for the beginner section", () => {
    expect(
      getBeginnerDecks().every((deck) => deck.tags.includes("초보 추천")),
    ).toBe(true);
  });

  it("finds a deck by stable slug", () => {
    const firstDeck = decks[0];
    expect(getDeck(firstDeck.slug)).toEqual(firstDeck);
    expect(getDeck("missing-deck")).toBeUndefined();
  });
});
