import { z } from "zod";

export const CommentCreateSchema = z.object({
  body: z.string().trim().min(2).max(2000),
});

const ReportReasonSchema = z.enum([
  "spam",
  "abuse",
  "false_claim",
  "copyright",
  "other",
]);

export const ReportCreateSchema = z.discriminatedUnion("targetType", [
  z.object({
    targetType: z.literal("deck"),
    deckSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,119}$/),
    reason: ReportReasonSchema,
    details: z.string().trim().max(2000).optional(),
  }),
  z.object({
    targetType: z.literal("comment"),
    targetId: z.uuid(),
    reason: ReportReasonSchema,
    details: z.string().trim().max(2000).optional(),
  }),
]);
