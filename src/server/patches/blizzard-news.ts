import { z } from "zod";

const NewsResponseSchema = z.object({
  feed: z.object({
    contentItems: z.array(
      z.object({
        properties: z.object({
          title: z.string(),
          category: z.string().optional(),
          lastUpdated: z.string(),
          newsUrl: z.string().url(),
          newsId: z.string(),
        }),
      }),
    ),
  }),
});

const PATCH_TITLE = /^(\d+\.\d+(?:\.\d+)?) Patch Notes$/;

export type OfficialPatch = {
  version: string;
  releasedAt: string;
  notesUrl: string;
  newsId: string;
};

export async function fetchLatestOfficialPatch({
  fetchImpl = fetch,
  endpoint = "https://news.blizzard.com/api/news/hearthstone?locale=en-us",
}: {
  fetchImpl?: typeof fetch;
  endpoint?: string;
} = {}): Promise<OfficialPatch> {
  const response = await fetchImpl(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HearthDeck-Hub/0.1 patch-monitor",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Official patch feed returned ${response.status}`);
  }

  const payload = NewsResponseSchema.parse(await response.json());
  const patches = payload.feed.contentItems.flatMap(({ properties }) => {
    const match = PATCH_TITLE.exec(properties.title.trim());
    if (!match || properties.category !== "Patch Notes") return [];
    return [
      {
        version: match[1]!,
        releasedAt: properties.lastUpdated,
        notesUrl: properties.newsUrl,
        newsId: properties.newsId,
      },
    ];
  });
  if (patches.length === 0) {
    throw new Error("Official patch feed contained no patch notes");
  }

  return patches.sort((left, right) =>
    comparePatchVersions(right.version, left.version),
  )[0]!;
}

export function comparePatchVersions(left: string, right: string) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function requiresCardLegalityReview(
  currentVersion: string,
  detectedVersion: string,
) {
  const [currentMajor] = currentVersion.split(".").map(Number);
  const [detectedMajor, detectedMinor] = detectedVersion.split(".").map(Number);
  return detectedMajor !== currentMajor || detectedMinor === 0;
}
