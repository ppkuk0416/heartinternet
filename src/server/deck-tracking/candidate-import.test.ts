import { describe, expect, it } from "vitest";
import {
  buildCandidateImportPlan,
  parseCandidateBatch,
} from "@/server/deck-tracking/candidate-import";

const validDeckCode =
  "AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";

describe("deck candidate import planning", () => {
  it("normalizes valid deck codes and creates stable fingerprints", () => {
    const batch = parseCandidateBatch({
      source: {
        slug: "test-ranked-source",
        name: "Test Ranked Source",
        sourceType: "ranked",
        homepageUrl: "https://example.com",
        ingestionMode: "api",
        trustTier: 2,
      },
      items: [
        {
          externalId: "deck-1",
          sourceUrl: "https://example.com/decks/1",
          deckCode: validDeckCode,
          classSlug: "warrior",
          patchVersion: "35.6",
        },
      ],
    });

    const first = buildCandidateImportPlan(batch);
    const second = buildCandidateImportPlan(batch);

    expect(first.items[0]?.codeHash).toHaveLength(64);
    expect(first.items[0]?.fingerprint).toBe(second.items[0]?.fingerprint);
    expect(first.warningCount).toBe(0);
  });

  it("keeps an invalid or missing code in the review pipeline without raw code", () => {
    const batch = parseCandidateBatch({
      source: {
        slug: "test-event-source",
        name: "Test Event Source",
        sourceType: "tournament",
        homepageUrl: "https://example.com",
        trustTier: 3,
      },
      items: [
        {
          sourceUrl: "https://example.com/event/deck",
          deckCode: "not-a-valid-deck-code-value",
        },
        {
          sourceUrl: "https://example.com/event/deck-2",
        },
      ],
    });

    const plan = buildCandidateImportPlan(batch);

    expect(plan.items.every((item) => item.rawDeckCode === undefined)).toBe(true);
    expect(plan.warningCount).toBe(2);
  });
});
