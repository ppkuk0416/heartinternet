import { createHmac } from "node:crypto";
import { z } from "zod";

export const ProductEventNameSchema = z.enum([
  "deck_list_viewed",
  "deck_detail_viewed",
  "deck_code_copied",
  "deck_submit_started",
  "deck_preview_succeeded",
  "deck_draft_created",
]);

const MetadataValueSchema = z.union([
  z.string().max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const ProductEventRequestSchema = z.object({
  eventName: ProductEventNameSchema,
  deckSlug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]{2,119}$/)
    .optional(),
  path: z.string().max(240).optional(),
  referrer: z.string().max(240).optional(),
  metadata: z.record(z.string().max(60), MetadataValueSchema).default({}),
});

export type ProductEventRequest = z.infer<typeof ProductEventRequestSchema>;

export function createAnonymousProductEventHash({
  address,
  userAgent,
  occurredOn,
  secret,
}: {
  address: string;
  userAgent: string;
  occurredOn: string;
  secret: string;
}) {
  if (secret.length < 32) {
    throw new Error("ANALYTICS_EVENT_HASH_SECRET must contain at least 32 characters");
  }

  return createHmac("sha256", secret)
    .update(`${occurredOn}\n${address}\n${userAgent}`, "utf8")
    .digest("hex");
}

export function sanitizeAnalyticsPath(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 240);
  if (!trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  return trimmed;
}

export function sanitizeAnalyticsReferrer(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 240);
  } catch {
    return undefined;
  }
}
