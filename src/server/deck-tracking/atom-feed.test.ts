import { describe, expect, it } from "vitest";
import {
  AtomDeckFeedConfigSchema,
  parseAtomDeckFeed,
} from "@/server/deck-tracking/atom-feed";

const deckCode = "AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=";
const config = AtomDeckFeedConfigSchema.parse({
  feedUrl: "https://www.reddit.com/r/CompetitiveHS/.rss",
  allowedHosts: ["www.reddit.com"],
  patchVersion: "35.6",
  maxAgeHours: 168,
  excludedAuthors: ["/u/deck-code-bot"],
  source: {
    slug: "competitivehs-test",
    name: "CompetitiveHS Test",
    sourceType: "community",
    homepageUrl: "https://www.reddit.com/r/CompetitiveHS/",
    trustTier: 1,
    pollIntervalMinutes: 60,
  },
});

describe("Atom deck feed adapter", () => {
  it("extracts and normalizes recent original deck posts", () => {
    const result = parseAtomDeckFeed(
      feed([
        entry({
          id: "t1-original",
          author: "/u/player",
          updated: "2026-06-06T12:00:00Z",
          content: `### Dragon Test\nHit legend #420 with a 12W-3L record.\n${deckCode}`,
        }),
        entry({
          id: "t1-bot",
          author: "/u/deck-code-bot",
          updated: "2026-06-06T12:01:00Z",
          content: deckCode,
        }),
      ]),
      config,
      new Date("2026-06-07T00:00:00Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      title: "Dragon Test",
      playerName: "player",
      claimedRank: "전설 420위",
      wins: 12,
      losses: 3,
      patchVersion: "35.6",
      format: "standard",
    });
  });

  it("drops stale entries and duplicate canonical codes", () => {
    const result = parseAtomDeckFeed(
      feed([
        entry({
          id: "stale",
          author: "/u/old",
          updated: "2026-05-01T00:00:00Z",
          content: deckCode,
        }),
        entry({
          id: "fresh-a",
          author: "/u/a",
          updated: "2026-06-06T12:00:00Z",
          content: deckCode,
        }),
        entry({
          id: "fresh-b",
          author: "/u/b",
          updated: "2026-06-06T13:00:00Z",
          content: deckCode,
        }),
      ]),
      config,
      new Date("2026-06-07T00:00:00Z"),
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.externalId).toContain("fresh-a");
  });
});

function feed(entries: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <updated>2026-06-07T00:00:00Z</updated>
    ${entries.join("\n")}
  </feed>`;
}

function entry({
  id,
  author,
  updated,
  content,
}: {
  id: string;
  author: string;
  updated: string;
  content: string;
}) {
  return `<entry>
    <id>${id}</id>
    <author><name>${author}</name></author>
    <link href="https://www.reddit.com/r/CompetitiveHS/comments/thread/${id}/" />
    <updated>${updated}</updated>
    <title>${author} on thread</title>
    <content type="html"><![CDATA[<div><p>${content}</p></div>]]></content>
  </entry>`;
}
