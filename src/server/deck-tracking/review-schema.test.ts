import { describe, expect, it } from "vitest";
import {
  candidateCanUseDeckCode,
  DeckCandidateDecisionSchema,
} from "@/server/deck-tracking/review-schema";

describe("deck candidate review policy", () => {
  it("requires a deck when linking and a reason when rejecting", () => {
    expect(
      DeckCandidateDecisionSchema.safeParse({ decision: "linked" }).success,
    ).toBe(false);
    expect(
      DeckCandidateDecisionSchema.safeParse({ decision: "rejected" }).success,
    ).toBe(false);
    expect(
      DeckCandidateDecisionSchema.safeParse({
        decision: "linked",
        targetDeckId: "30000000-0000-4000-8000-000000000001",
      }).success,
    ).toBe(true);
  });

  it("keeps candidates without a validated code out of approve/link actions", () => {
    expect(candidateCanUseDeckCode("not_supplied")).toBe(false);
    expect(candidateCanUseDeckCode("pending")).toBe(false);
    expect(candidateCanUseDeckCode("valid")).toBe(true);
  });
});
