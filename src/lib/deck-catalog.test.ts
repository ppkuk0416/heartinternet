import { describe, expect, it } from "vitest";
import { queryDemoDecks } from "@/lib/deck-catalog";
import { decks } from "@/lib/decks";

describe("queryDemoDecks", () => {
  it("combines search, class, tag, and current-patch filters", () => {
    const result = queryDemoDecks(decks, {
      query: "오라",
      className: "성기사",
      tag: "초보 추천",
    });

    expect(result.total).toBe(1);
    expect(result.decks[0]?.slug).toBe("aura-paladin-budget");
  });

  it("excludes previous-patch decks unless requested", () => {
    const current = queryDemoDecks(decks, { pageSize: 24 });
    const all = queryDemoDecks(decks, {
      includeOld: true,
      pageSize: 24,
    });

    expect(current.decks.every((deck) => deck.patchStatus === "현재 패치")).toBe(
      true,
    );
    expect(all.total).toBeGreaterThan(current.total);
  });

  it("returns stable pages after sorting", () => {
    const first = queryDemoDecks(decks, {
      includeOld: true,
      sort: "copies",
      page: 1,
      pageSize: 2,
    });
    const second = queryDemoDecks(decks, {
      includeOld: true,
      sort: "copies",
      page: 2,
      pageSize: 2,
    });

    expect(first.decks).toHaveLength(2);
    expect(second.decks).toHaveLength(2);
    expect(first.decks[0]!.copies).toBeGreaterThanOrEqual(first.decks[1]!.copies);
    expect(first.decks.map((deck) => deck.slug)).not.toEqual(
      second.decks.map((deck) => deck.slug),
    );
  });

  it("filters source types and trusted evidence", () => {
    const ranked = queryDemoDecks(decks, {
      source: "ranked",
      includeOld: true,
      pageSize: 24,
    });
    const trusted = queryDemoDecks(decks, {
      trustedOnly: true,
      includeOld: true,
      pageSize: 24,
    });

    expect(ranked.decks.every((deck) => deck.sourceType === "랭크 덱")).toBe(
      true,
    );
    expect(trusted.decks.every((deck) => deck.evidence !== "작성자 입력")).toBe(
      true,
    );
  });

  it("ranks recently tracked decks ahead of untracked catalog entries", () => {
    const result = queryDemoDecks(decks, {
      trustedOnly: true,
      sort: "trending",
      pageSize: 24,
    });

    expect(result.decks[0]?.slug).toBe("tempo-demon-hunter-starter");
    expect(result.decks[0]?.trackingSourceCount).toBeGreaterThan(0);
    expect(result.decks[0]!.trendScore).toBeGreaterThanOrEqual(
      result.decks[1]?.trendScore ?? 0,
    );
  });

  it("recovers an out-of-range page to the first page", () => {
    const result = queryDemoDecks(decks, {
      includeOld: true,
      page: 100,
      pageSize: 2,
    });

    expect(result.page).toBe(1);
    expect(result.total).toBeGreaterThan(0);
    expect(result.decks).toHaveLength(2);
  });
});
