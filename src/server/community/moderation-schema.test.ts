import { describe, expect, it } from "vitest";
import { ReportDecisionSchema } from "@/server/community/moderation-schema";

describe("report moderation contract", () => {
  it("requires a supported decision and an audit note", () => {
    expect(
      ReportDecisionSchema.safeParse({
        decision: "hidden",
        note: "허위 전적 확인",
      }).success,
    ).toBe(true);
    expect(
      ReportDecisionSchema.safeParse({
        decision: "hidden",
        note: "",
      }).success,
    ).toBe(false);
  });
});
