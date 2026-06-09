import { createHash } from "node:crypto";
import { z } from "zod";
import { decodeDeckstring } from "@/server/deckstrings/adapter";

const SourceTypeSchema = z.enum([
  "community",
  "ranked",
  "creator",
  "tournament",
  "external_stats",
]);
const IngestionModeSchema = z.enum(["manual", "json_feed", "api", "webhook"]);
const FormatSchema = z.enum(["standard", "wild", "twist"]);

const CandidateBatchSchema = z.object({
  source: z.object({
    slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
    name: z.string().min(2).max(120),
    sourceType: SourceTypeSchema,
    homepageUrl: z.url(),
    ingestionMode: IngestionModeSchema.default("manual"),
    trustTier: z.number().int().min(1).max(3),
    pollIntervalMinutes: z.number().int().min(15).max(10080).default(360),
  }),
  providerRevision: z.string().min(1).max(160).optional(),
  items: z
    .array(
      z
        .object({
          externalId: z.string().min(1).max(200).optional(),
          sourceUrl: z.url(),
          sourcePublishedAt: z.iso.datetime().optional(),
          title: z.string().min(1).max(160).optional(),
          playerName: z.string().min(1).max(120).optional(),
          eventName: z.string().min(1).max(160).optional(),
          claimedRank: z.string().min(1).max(80).optional(),
          deckCode: z.string().min(20).max(4096).optional(),
          classSlug: z.string().min(2).max(32).optional(),
          patchVersion: z.string().min(1).max(24).optional(),
          format: FormatSchema.default("standard"),
          wins: z.number().int().min(0).optional(),
          losses: z.number().int().min(0).optional(),
          metadata: z.record(z.string(), z.unknown()).default({}),
        })
        .refine((item) => (item.wins === undefined) === (item.losses === undefined), {
          message: "wins and losses must be supplied together",
        }),
    )
    .min(1)
    .max(500),
});

export type CandidateBatch = z.infer<typeof CandidateBatchSchema>;

export type PlannedCandidate = {
  fingerprint: string;
  clusterKey: string;
  externalId?: string;
  sourceUrl: string;
  sourcePublishedAt?: string;
  title?: string;
  playerName?: string;
  eventName?: string;
  claimedRank?: string;
  rawDeckCode?: string;
  codeHash?: string;
  classSlug?: string;
  patchVersion?: string;
  format: "standard" | "wild" | "twist";
  wins?: number;
  losses?: number;
  metadata: Record<string, unknown>;
  payloadHash: string;
  warnings: string[];
  codeValidationStatus:
    | "not_supplied"
    | "pending"
    | "valid"
    | "invalid"
    | "unavailable";
  codeValidationIssues: Array<{
    code: string;
    severity: "error" | "warning";
    message: string;
  }>;
  codeValidatedAt?: string;
};

export function parseCandidateBatch(input: unknown): CandidateBatch {
  return CandidateBatchSchema.parse(input);
}

export function buildCandidateImportPlan(batch: CandidateBatch) {
  const items = batch.items.map<PlannedCandidate>((item) => {
    const warnings: string[] = [];
    let rawDeckCode: string | undefined;
    let codeHash: string | undefined;

    if (item.deckCode) {
      try {
        const decoded = decodeDeckstring(item.deckCode);
        rawDeckCode = decoded.canonicalCode;
        codeHash = decoded.codeHash;
        if (decoded.format !== item.format) {
          warnings.push(
            `Declared format ${item.format} differs from deck code format ${decoded.format}.`,
          );
        }
      } catch (error) {
        warnings.push(
          error instanceof Error
            ? `Deck code was not staged: ${error.message}`
            : "Deck code was not staged because it is invalid.",
        );
      }
    } else {
      warnings.push("No deck code was supplied; candidate requires code review.");
    }

    const identity =
      codeHash ??
      item.externalId ??
      [
        item.sourceUrl,
        item.playerName ?? "",
        item.eventName ?? "",
        item.classSlug ?? "",
      ].join("|");
    const fingerprint = hash(`${batch.source.slug}|${identity}`);
    const clusterKey = codeHash ?? hash(`unresolved|${identity}`);

    return {
      fingerprint,
      clusterKey,
      externalId: item.externalId,
      sourceUrl: item.sourceUrl,
      sourcePublishedAt: item.sourcePublishedAt,
      title: item.title,
      playerName: item.playerName,
      eventName: item.eventName,
      claimedRank: item.claimedRank,
      rawDeckCode,
      codeHash,
      classSlug: item.classSlug,
      patchVersion: item.patchVersion,
      format: item.format,
      wins: item.wins,
      losses: item.losses,
      metadata: item.metadata,
      payloadHash: hash(JSON.stringify(item)),
      warnings,
      codeValidationStatus: rawDeckCode ? "pending" : "not_supplied",
      codeValidationIssues: [],
    };
  });

  return {
    source: batch.source,
    providerRevision: batch.providerRevision,
    items,
    warningCount: items.reduce((total, item) => total + item.warnings.length, 0),
  };
}

function hash(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
