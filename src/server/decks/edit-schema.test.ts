import { describe, expect, it } from "vitest";
import { DeckEditRequestSchema } from "@/server/decks/edit-schema";

const valid = {
  title: "드래곤 흑마법사",
  summary: "현재 패치에서 검토한 드래곤 중심의 정규전 덱 운영 가이드입니다.",
  recommendedFor: "중반 이후 자원 운영을 선호하는 유저",
  difficulty: "medium",
  gamePlan: "초반 제거기로 버티고 중반부터 드래곤 연계로 필드를 장악합니다.",
  mulliganGuide: "저비용 제거기와 초반 드로우 카드를 우선합니다.",
  cardChoices: "",
  matchupNotes: "",
};

describe("deck edit request", () => {
  it("accepts publication-ready guide content", () => {
    expect(DeckEditRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a guide that cannot satisfy publication requirements", () => {
    expect(
      DeckEditRequestSchema.safeParse({ ...valid, gamePlan: "짧음" }).success,
    ).toBe(false);
  });
});
