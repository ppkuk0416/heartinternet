import { z } from "zod";

export const DeckDraftRequestSchema = z.object({
  deckCode: z.string().trim().min(20).max(6_000),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(20).max(320),
  recommendedFor: z.string().trim().min(3).max(240),
  difficulty: z.enum(["easy", "medium", "hard"]),
  gamePlan: z.string().trim().min(20).max(4_000),
  mulliganGuide: z.string().trim().min(10).max(3_000),
  cardChoices: z.string().trim().max(3_000).default(""),
  matchupNotes: z.string().trim().max(3_000).default(""),
  sourceType: z.enum([
    "community",
    "ranked",
    "creator",
    "tournament",
    "external_stats",
  ]),
  sourceUrl: z.union([z.literal(""), z.url().max(2_000)]).default(""),
  sourceName: z.string().trim().max(120).default(""),
  claimedRank: z.string().trim().max(80).default(""),
  wins: z.number().int().nonnegative().nullable(),
  losses: z.number().int().nonnegative().nullable(),
  playedFrom: z.union([z.literal(""), z.iso.date()]).default(""),
  playedTo: z.union([z.literal(""), z.iso.date()]).default(""),
  evidenceNote: z.string().trim().max(2_000).default(""),
  intent: z.enum(["draft", "publish"]),
}).superRefine((value, context) => {
  if ((value.wins === null) !== (value.losses === null)) {
    context.addIssue({
      code: "custom",
      path: ["wins"],
      message: "승수와 패수는 함께 입력해야 합니다.",
    });
  }
  if (value.playedFrom && value.playedTo && value.playedTo < value.playedFrom) {
    context.addIssue({
      code: "custom",
      path: ["playedTo"],
      message: "종료일은 시작일보다 빠를 수 없습니다.",
    });
  }
});

export type DeckDraftRequest = z.infer<typeof DeckDraftRequestSchema>;
