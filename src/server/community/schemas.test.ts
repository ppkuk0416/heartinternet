import { describe, expect, it } from "vitest";
import {
  CommentCreateSchema,
  ReportCreateSchema,
} from "@/server/community/schemas";

describe("community request contracts", () => {
  it("trims valid comments and rejects empty discussion noise", () => {
    expect(CommentCreateSchema.parse({ body: "  교체 카드가 궁금합니다.  " })).toEqual({
      body: "교체 카드가 궁금합니다.",
    });
    expect(CommentCreateSchema.safeParse({ body: " " }).success).toBe(false);
  });

  it("requires a slug for deck reports and a UUID for comment reports", () => {
    expect(
      ReportCreateSchema.safeParse({
        targetType: "deck",
        deckSlug: "valid-deck",
        reason: "false_claim",
      }).success,
    ).toBe(true);
    expect(
      ReportCreateSchema.safeParse({
        targetType: "comment",
        targetId: "not-a-uuid",
        reason: "spam",
      }).success,
    ).toBe(false);
  });
});
