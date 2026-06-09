import { z } from "zod";

export const ReportDecisionSchema = z.object({
  decision: z.enum(["reviewing", "dismissed", "hidden"]),
  note: z.string().trim().min(3).max(1000),
});
