// @vitest-environment node

import { describe, expect, it } from "vitest";
import { DeckDraftRequestSchema } from "@/server/decks/draft-schema";

const valid = {
  deckCode: "A".repeat(24),
  title: "테스트 덱",
  summary: "이 덱을 추천하는 이유를 충분히 설명하는 요약 문장입니다.",
  recommendedFor: "정규전을 시작하는 복귀 유저",
  difficulty: "easy",
  gamePlan: "초반에는 필드를 잡고 중반부터 상대 영웅에게 피해를 누적합니다.",
  mulliganGuide: "저비용 하수인을 우선해서 찾습니다.",
  cardChoices: "",
  matchupNotes: "",
  sourceType: "community",
  sourceUrl: "",
  sourceName: "본인 등급전",
  claimedRank: "",
  wins: 8,
  losses: 4,
  playedFrom: "",
  playedTo: "",
  evidenceNote: "",
  intent: "publish",
};

describe("DeckDraftRequestSchema", () => {
  it("accepts a complete guide draft", () => {
    expect(DeckDraftRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a code-only contribution without a useful guide", () => {
    const result = DeckDraftRequestSchema.safeParse({
      ...valid,
      summary: "짧음",
      gamePlan: "없음",
    });
    expect(result.success).toBe(false);
  });

  it("rejects partial records and reversed play dates", () => {
    expect(
      DeckDraftRequestSchema.safeParse({
        ...valid,
        losses: null,
        playedFrom: "2026-06-06",
        playedTo: "2026-06-01",
      }).success,
    ).toBe(false);
  });
});
