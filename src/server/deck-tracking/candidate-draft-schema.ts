import { z } from "zod";

export const CandidateDraftRequestSchema = z.object({
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(20).max(320),
});

export type CandidateDraftRequest = z.infer<typeof CandidateDraftRequestSchema>;
