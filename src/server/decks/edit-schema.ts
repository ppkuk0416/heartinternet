import { z } from "zod";

export const DeckEditRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(20).max(320),
  recommendedFor: z.string().trim().min(3).max(240),
  difficulty: z.enum(["easy", "medium", "hard"]),
  gamePlan: z.string().trim().min(20).max(5_000),
  mulliganGuide: z.string().trim().min(10).max(3_000),
  cardChoices: z.string().trim().max(5_000),
  matchupNotes: z.string().trim().max(5_000),
});

export type DeckEditRequest = z.infer<typeof DeckEditRequestSchema>;
