import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { decodeDeckstring } from "@/server/deckstrings/adapter";

const SourceSchema = z.object({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  name: z.string().min(2).max(120),
  sourceType: z.enum([
    "community",
    "ranked",
    "creator",
    "tournament",
    "external_stats",
  ]),
  homepageUrl: z.url(),
  ingestionMode: z.literal("json_feed").default("json_feed"),
  trustTier: z.number().int().min(1).max(3),
  pollIntervalMinutes: z.number().int().min(15).max(10080),
});

export const AtomDeckFeedConfigSchema = z.object({
  feedUrl: z.url().refine((value) => value.startsWith("https://"), {
    message: "Feed URL must use HTTPS.",
  }),
  allowedHosts: z.array(z.string().min(1)).min(1),
  patchVersion: z.string().min(1).max(24),
  eventName: z.string().min(1).max(160).optional(),
  maxAgeHours: z.number().int().min(1).max(2160).default(168),
  maxEntries: z.number().int().min(1).max(500).default(100),
  excludedAuthors: z.array(z.string()).default([]),
  source: SourceSchema,
});

export type AtomDeckFeedConfig = z.infer<typeof AtomDeckFeedConfigSchema>;

type AtomEntry = {
  id?: unknown;
  title?: unknown;
  updated?: unknown;
  published?: unknown;
  author?: { name?: unknown };
  link?: { "@_href"?: unknown } | Array<{ "@_href"?: unknown }>;
  content?: unknown;
  summary?: unknown;
};

export type FeedCandidateBatch = {
  source: AtomDeckFeedConfig["source"];
  providerRevision: string;
  items: Array<{
    externalId: string;
    sourceUrl: string;
    sourcePublishedAt: string;
    title: string;
    playerName?: string;
    eventName?: string;
    claimedRank?: string;
    deckCode: string;
    patchVersion: string;
    format: "standard" | "wild" | "twist";
    wins?: number;
    losses?: number;
    metadata: Record<string, unknown>;
  }>;
};

export function parseAtomDeckFeed(
  xml: string,
  configInput: AtomDeckFeedConfig,
  now = new Date(),
): FeedCandidateBatch {
  const config = AtomDeckFeedConfigSchema.parse(configInput);
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    processEntities: true,
    trimValues: true,
  });
  const document = parser.parse(xml) as { feed?: { entry?: AtomEntry | AtomEntry[] } };
  const rawEntries = document.feed?.entry;
  const entries = (Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [])
    .slice(0, config.maxEntries);
  const cutoff = now.getTime() - config.maxAgeHours * 60 * 60 * 1_000;
  const excludedAuthors = new Set(
    config.excludedAuthors.map((author) => author.toLocaleLowerCase("en-US")),
  );
  const seenCodeHashes = new Set<string>();
  const items: FeedCandidateBatch["items"] = [];

  for (const entry of entries) {
    const id = stringValue(entry.id);
    const sourceUrl = entryLink(entry);
    const publishedAt = dateValue(entry.published ?? entry.updated);
    const author = stringValue(entry.author?.name);
    if (!id || !sourceUrl || !publishedAt) continue;
    if (new Date(publishedAt).getTime() < cutoff) continue;
    if (excludedAuthors.has(author.toLocaleLowerCase("en-US"))) continue;

    const content = nodeText(entry.content) || nodeText(entry.summary);
    const plainText = stripMarkup(content);
    for (const candidateCode of extractCodeCandidates(content)) {
      try {
        const decoded = decodeDeckstring(candidateCode);
        if (decoded.format === "classic") continue;
        if (seenCodeHashes.has(decoded.codeHash)) continue;
        seenCodeHashes.add(decoded.codeHash);

        const record = extractRecord(plainText);
        items.push({
          externalId: `${id}:${decoded.codeHash.slice(0, 12)}`,
          sourceUrl,
          sourcePublishedAt: new Date(publishedAt).toISOString(),
          title: candidateTitle(
            plainText,
            author,
            stringValue(entry.title),
          ),
          playerName: normalizeAuthor(author),
          eventName: config.eventName,
          claimedRank: extractRank(plainText),
          deckCode: decoded.canonicalCode,
          patchVersion: config.patchVersion,
          format: decoded.format,
          wins: record?.wins,
          losses: record?.losses,
          metadata: {
            feedEntryId: id,
            feedUrl: config.feedUrl,
            communityExcerpt: plainText.slice(0, 280),
          },
        });
      } catch {
        // Long base64-looking text that is not a Hearthstone deckstring is ignored.
      }
    }
  }

  const revision =
    stringValue((document.feed as { updated?: unknown } | undefined)?.updated) ||
    now.toISOString();
  return {
    source: config.source,
    providerRevision: `atom:${revision}`.slice(0, 160),
    items,
  };
}

export async function fetchAtomDeckFeed(configInput: AtomDeckFeedConfig) {
  const config = AtomDeckFeedConfigSchema.parse(configInput);
  const requestedUrl = new URL(config.feedUrl);
  if (!config.allowedHosts.includes(requestedUrl.hostname)) {
    throw new Error(`Feed host is not allowed: ${requestedUrl.hostname}`);
  }

  const response = await fetch(requestedUrl, {
    headers: {
      Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml",
      "User-Agent": "HearthDeckHub/0.1 (+deck discovery; moderator reviewed)",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error(`Feed request failed with HTTP ${response.status}.`);
  }
  const resolvedUrl = new URL(response.url);
  if (!config.allowedHosts.includes(resolvedUrl.hostname)) {
    throw new Error(`Feed redirected to a non-allowed host: ${resolvedUrl.hostname}`);
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > 2_000_000) throw new Error("Feed exceeds the 2 MB limit.");
  const xml = await response.text();
  if (Buffer.byteLength(xml, "utf8") > 2_000_000) {
    throw new Error("Feed exceeds the 2 MB limit.");
  }
  return parseAtomDeckFeed(xml, config);
}

function extractCodeCandidates(value: string) {
  return value.match(/\bAAE[A-Za-z0-9+/]{32,}={0,2}/g) ?? [];
}

function nodeText(value: unknown): string {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "#text" in value &&
    typeof (value as { "#text": unknown })["#text"] === "string"
  ) {
    return (value as { "#text": string })["#text"];
  }
  return "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dateValue(value: unknown) {
  const text = stringValue(value);
  return text && !Number.isNaN(Date.parse(text)) ? text : "";
}

function entryLink(entry: AtomEntry) {
  const links = Array.isArray(entry.link) ? entry.link : entry.link ? [entry.link] : [];
  return links
    .map((link) => stringValue(link["@_href"]))
    .find((href) => href.startsWith("https://")) ?? "";
}

function stripMarkup(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeAuthor(author: string) {
  return author.replace(/^\/u\//i, "").slice(0, 120) || undefined;
}

function candidateTitle(text: string, author: string, entryTitle: string) {
  const markdownHeading = text.match(/(?:^|\n)#{1,3}\s*([^\n#]{2,80})/);
  const heading = markdownHeading?.[1]?.trim();
  if (heading && !/^to use this deck/i.test(heading)) return heading.slice(0, 160);
  if (entryTitle && !/^\/u\/.+\s+on\s+/i.test(entryTitle)) {
    return entryTitle.slice(0, 160);
  }
  return `${normalizeAuthor(author) ?? "커뮤니티 유저"}의 최근 덱`.slice(0, 160);
}

function extractRank(text: string) {
  const legendFirst = text.match(/\blegend(?:\s+(?:at|rank))?\s*#?\s*(\d{1,5})\b/i);
  if (legendFirst?.[1]) return `전설 ${legendFirst[1]}위`;
  const numberFirst = text.match(/\b(?:rank\s*)?#?(\d{1,5})\s+legend\b/i);
  return numberFirst?.[1] ? `전설 ${numberFirst[1]}위` : undefined;
}

function extractRecord(text: string) {
  const result = text.match(
    /\b(\d{1,3})\s*(?:w|wins?)\s*[-/:]?\s*(\d{1,3})\s*(?:l|loss(?:es)?)\b/i,
  );
  return result?.[1] && result[2]
    ? { wins: Number(result[1]), losses: Number(result[2]) }
    : undefined;
}
