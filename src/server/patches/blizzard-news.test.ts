import { describe, expect, it } from "vitest";
import {
  comparePatchVersions,
  fetchLatestOfficialPatch,
  requiresCardLegalityReview,
} from "@/server/patches/blizzard-news";

describe("official Hearthstone patch detection", () => {
  it("selects the highest semantic patch from Blizzard news", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          feed: {
            contentItems: [
              {
                properties: {
                  title: "35.4.2 Patch Notes",
                  category: "Patch Notes",
                  lastUpdated: "2026-05-19T17:00:00Z",
                  newsUrl:
                    "https://news.blizzard.com/en-us/article/2/35-4-2-patch-notes",
                  newsId: "2",
                },
              },
              {
                properties: {
                  title: "35.6 Patch Notes",
                  category: "Patch Notes",
                  lastUpdated: "2026-06-02T16:56:00Z",
                  newsUrl:
                    "https://news.blizzard.com/en-us/article/3/35-6-patch-notes",
                  newsId: "3",
                },
              },
            ],
          },
        }),
      );

    await expect(
      fetchLatestOfficialPatch({ fetchImpl: fetchImpl as typeof fetch }),
    ).resolves.toMatchObject({
      version: "35.6",
      newsId: "3",
    });
  });

  it("compares dotted patch versions numerically", () => {
    expect(comparePatchVersions("35.10", "35.6.2")).toBeGreaterThan(0);
    expect(comparePatchVersions("35.6", "35.6.0")).toBe(0);
  });

  it("requires card legality review for a new major or .0 release", () => {
    expect(requiresCardLegalityReview("35.6", "35.6.2")).toBe(false);
    expect(requiresCardLegalityReview("35.6", "36.0")).toBe(true);
    expect(requiresCardLegalityReview("35.6", "36.2")).toBe(true);
  });
});
