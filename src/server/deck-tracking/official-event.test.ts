import { describe, expect, it } from "vitest";
import { buildOfficialEventImport } from "@/server/deck-tracking/official-event";

const deckCode = "AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const articleUrl =
  "https://news.blizzard.com/en-us/article/24276663/the-hearthstone-spring-championship-is-here";

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      newsId: "24276663",
      officialUrl: articleUrl,
      name: "2026 Spring Championship",
      patchVersion: "35.6",
      ...overrides,
    },
    submissions: [
      {
        externalId: "spring-2026-player-one-deck-one",
        playerName: "Player One",
        deckCode,
        claimedRank: "Top 8",
      },
    ],
  };
}

function officialFeed(category = "Esports", newsUrl = articleUrl) {
  return async () =>
    new Response(
      JSON.stringify({
        feed: {
          contentItems: [
            {
              properties: {
                title: "The Hearthstone Spring Championship Is Here!",
                category,
                lastUpdated: "2026-05-29T16:55:00Z",
                newsUrl,
                newsId: "24276663",
              },
            },
          ],
        },
      }),
    );
}

describe("official Hearthstone event import", () => {
  it("verifies the official Esports article and preserves code provenance", async () => {
    const result = await buildOfficialEventImport({
      input: manifest(),
      fetchImpl: officialFeed() as typeof fetch,
      verifiedAt: "2026-06-07T00:00:00Z",
    });

    expect(result.verification.articleTitle).toContain("Spring Championship");
    expect(result.plan.source).toMatchObject({
      sourceType: "tournament",
      trustTier: 3,
      ingestionMode: "manual",
    });
    expect(result.plan.items[0]).toMatchObject({
      playerName: "Player One",
      eventName: "2026 Spring Championship",
      patchVersion: "35.6",
      metadata: {
        officialEventVerified: true,
        deckCodeProvenance: "operator_manifest",
        deckCodeOfficiallyVerified: false,
      },
    });
  });

  it("rejects a news URL whose ID does not match the manifest", async () => {
    await expect(
      buildOfficialEventImport({
        input: manifest({ newsId: "999" }),
        fetchImpl: officialFeed() as typeof fetch,
      }),
    ).rejects.toThrow("does not contain news ID 999");
  });

  it("rejects official articles that are not categorized as Esports", async () => {
    await expect(
      buildOfficialEventImport({
        input: manifest(),
        fetchImpl: officialFeed("Patch Notes") as typeof fetch,
      }),
    ).rejects.toThrow("not Esports");
  });

  it("rejects a manifest URL that differs from the official feed URL", async () => {
    await expect(
      buildOfficialEventImport({
        input: manifest(),
        fetchImpl: officialFeed(
          "Esports",
          "https://news.blizzard.com/en-us/article/24276663/a-different-slug",
        ) as typeof fetch,
      }),
    ).rejects.toThrow("does not match");
  });

  it("rejects duplicate submission IDs before fetching the official feed", async () => {
    const input = manifest();
    input.submissions.push({ ...input.submissions[0]! });

    await expect(
      buildOfficialEventImport({
        input,
        fetchImpl: officialFeed() as typeof fetch,
      }),
    ).rejects.toThrow("Duplicate submission externalId");
  });
});
