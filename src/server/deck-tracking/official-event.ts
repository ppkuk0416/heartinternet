import { z } from "zod";
import {
  buildCandidateImportPlan,
  parseCandidateBatch,
} from "@/server/deck-tracking/candidate-import";

const OfficialEventManifestSchema = z.object({
  event: z.object({
    newsId: z.string().regex(/^\d+$/),
    officialUrl: z.url(),
    name: z.string().min(2).max(160),
    sourceSlug: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]{2,79}$/)
      .optional(),
    sourceName: z.string().min(2).max(120).optional(),
    patchVersion: z.string().min(1).max(24),
    format: z.enum(["standard", "wild", "twist"]).default("standard"),
    startsAt: z.iso.datetime().optional(),
    endsAt: z.iso.datetime().optional(),
  }),
  submissions: z
    .array(
      z
        .object({
          externalId: z.string().min(1).max(200),
          playerName: z.string().min(1).max(120),
          deckCode: z.string().min(20).max(4096),
          title: z.string().min(1).max(160).optional(),
          claimedRank: z.string().min(1).max(80).optional(),
          classSlug: z.string().min(2).max(32).optional(),
          sourceUrl: z.url().optional(),
          submittedAt: z.iso.datetime().optional(),
          wins: z.number().int().min(0).optional(),
          losses: z.number().int().min(0).optional(),
          notes: z.string().max(1000).optional(),
        })
        .refine(
          (submission) =>
            (submission.wins === undefined) ===
            (submission.losses === undefined),
          { message: "wins and losses must be supplied together" },
        ),
    )
    .min(1)
    .max(500)
    .superRefine((submissions, context) => {
      const seen = new Set<string>();
      submissions.forEach((submission, index) => {
        if (seen.has(submission.externalId)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate submission externalId: ${submission.externalId}`,
            path: [index, "externalId"],
          });
        }
        seen.add(submission.externalId);
      });
    }),
});

const NewsResponseSchema = z.object({
  feed: z.object({
    contentItems: z.array(
      z.object({
        properties: z.object({
          title: z.string(),
          category: z.string().optional(),
          lastUpdated: z.string(),
          newsUrl: z.url(),
          newsId: z.string(),
        }),
      }),
    ),
  }),
});

export type OfficialEventManifest = z.infer<
  typeof OfficialEventManifestSchema
>;

export type OfficialEventVerification = {
  newsId: string;
  articleTitle: string;
  articleUrl: string;
  lastUpdated: string;
  verifiedAt: string;
};

export async function buildOfficialEventImport({
  input,
  fetchImpl = fetch,
  endpoint = "https://news.blizzard.com/api/news/hearthstone?locale=en-us",
  verifiedAt = new Date().toISOString(),
}: {
  input: unknown;
  fetchImpl?: typeof fetch;
  endpoint?: string;
  verifiedAt?: string;
}) {
  const manifest = OfficialEventManifestSchema.parse(input);
  assertOfficialArticleUrl(manifest.event.officialUrl, manifest.event.newsId);

  const response = await fetchImpl(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HearthDeck-Hub/0.1 official-event-import",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Official Hearthstone news feed returned ${response.status}`);
  }

  const payload = NewsResponseSchema.parse(await response.json());
  const article = payload.feed.contentItems
    .map(({ properties }) => properties)
    .find((properties) => properties.newsId === manifest.event.newsId);
  if (!article) {
    throw new Error(
      `Official Hearthstone news feed did not contain news ID ${manifest.event.newsId}`,
    );
  }
  if (article.category !== "Esports") {
    throw new Error(
      `Official news ID ${article.newsId} is categorized as ${article.category ?? "unknown"}, not Esports`,
    );
  }

  assertMatchingArticleUrls(manifest.event.officialUrl, article.newsUrl);

  const verification: OfficialEventVerification = {
    newsId: article.newsId,
    articleTitle: article.title,
    articleUrl: article.newsUrl,
    lastUpdated: article.lastUpdated,
    verifiedAt,
  };
  const sourceSlug =
    manifest.event.sourceSlug ?? `blizzard-event-${manifest.event.newsId}`;
  const batch = parseCandidateBatch({
    source: {
      slug: sourceSlug,
      name:
        manifest.event.sourceName ??
        `Blizzard Esports · ${manifest.event.name}`,
      sourceType: "tournament",
      homepageUrl: manifest.event.officialUrl,
      ingestionMode: "manual",
      trustTier: 3,
      pollIntervalMinutes: 10080,
    },
    providerRevision: `blizzard-news-${article.newsId}-${article.lastUpdated}`,
    items: manifest.submissions.map((submission) => ({
      externalId: submission.externalId,
      sourceUrl: submission.sourceUrl ?? manifest.event.officialUrl,
      sourcePublishedAt: submission.submittedAt ?? article.lastUpdated,
      title:
        submission.title ??
        `${submission.playerName} · ${manifest.event.name}`,
      playerName: submission.playerName,
      eventName: manifest.event.name,
      claimedRank: submission.claimedRank,
      deckCode: submission.deckCode,
      classSlug: submission.classSlug,
      patchVersion: manifest.event.patchVersion,
      format: manifest.event.format,
      wins: submission.wins,
      losses: submission.losses,
      metadata: {
        officialEventVerified: true,
        officialNewsId: article.newsId,
        officialArticleTitle: article.title,
        officialArticleUrl: article.newsUrl,
        officialArticleLastUpdated: article.lastUpdated,
        officialArticleVerifiedAt: verifiedAt,
        deckCodeProvenance: "operator_manifest",
        deckCodeOfficiallyVerified: false,
        eventStartsAt: manifest.event.startsAt,
        eventEndsAt: manifest.event.endsAt,
        operatorNotes: submission.notes,
      },
    })),
  });

  return {
    manifest,
    verification,
    plan: buildCandidateImportPlan(batch),
  };
}

function assertOfficialArticleUrl(url: string, newsId: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "news.blizzard.com") {
    throw new Error("Official event URL must use https://news.blizzard.com");
  }
  if (articleIdFromPath(parsed.pathname) !== newsId) {
    throw new Error(`Official event URL does not contain news ID ${newsId}`);
  }
}

function assertMatchingArticleUrls(manifestUrl: string, feedUrl: string) {
  const manifest = new URL(manifestUrl);
  const feed = new URL(feedUrl);
  if (
    manifest.hostname !== feed.hostname ||
    normalizePath(manifest.pathname) !== normalizePath(feed.pathname)
  ) {
    throw new Error("Manifest URL does not match the official news feed URL");
  }
}

function articleIdFromPath(pathname: string) {
  return /^\/[a-z]{2}-[a-z]{2}\/article\/(\d+)(?:\/|$)/.exec(pathname)?.[1];
}

function normalizePath(pathname: string) {
  return pathname.replace(/\/+$/, "").toLowerCase();
}
