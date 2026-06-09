import { describe, expect, it } from "vitest";
import { buildContentReadinessSummary } from "@/server/content/readiness-summary";

describe("content readiness summary", () => {
  it("passes only when every launch content criterion is met", () => {
    const summary = buildContentReadinessSummary({
      currentPatch: "35.6",
      totals: {
        published: 34,
        currentPatchPublished: 30,
        representedClasses: 8,
        trustedCurrentDecks: 10,
        beginnerCurrentDecks: 5,
        guideCompleteCurrentDecks: 30,
      },
    });

    expect(summary.ready).toBe(true);
    expect(summary.checks.every((check) => check.severity === "pass")).toBe(true);
  });

  it("shows warnings before a criterion fully fails", () => {
    const summary = buildContentReadinessSummary({
      totals: {
        published: 24,
        currentPatchPublished: 24,
        representedClasses: 7,
        trustedCurrentDecks: 8,
        beginnerCurrentDecks: 4,
        guideCompleteCurrentDecks: 24,
      },
    });

    expect(summary.ready).toBe(false);
    expect(summary.checks.find((check) => check.key === "current_patch_decks"))
      .toMatchObject({ severity: "warning", value: 24, target: 30 });
  });

  it("fails clearly for an empty catalog", () => {
    const summary = buildContentReadinessSummary({
      totals: {
        published: 0,
        currentPatchPublished: 0,
        representedClasses: 0,
        trustedCurrentDecks: 0,
        beginnerCurrentDecks: 0,
        guideCompleteCurrentDecks: 0,
      },
    });

    expect(summary.ready).toBe(false);
    expect(summary.checks.map((check) => check.severity)).toContain("fail");
  });
});
