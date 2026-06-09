import { describe, expect, it } from "vitest";
import { CandidateDraftRequestSchema } from "@/server/deck-tracking/candidate-draft-schema";

describe("candidate draft request", () => {
  it("accepts a concise curated title and publication-ready summary", () => {
    expect(
      CandidateDraftRequestSchema.parse({
        title: "드래곤 흑마법사",
        summary: "원문에서 수집한 최신 정규전 후보를 운영진이 검토 중인 초안입니다.",
      }),
    ).toMatchObject({ title: "드래곤 흑마법사" });
  });

  it("rejects empty and oversized editorial fields", () => {
    expect(
      CandidateDraftRequestSchema.safeParse({ title: "덱" }).success,
    ).toBe(false);
    expect(
      CandidateDraftRequestSchema.safeParse({ title: "정상 제목" }).success,
    ).toBe(false);
    expect(
      CandidateDraftRequestSchema.safeParse({
        title: "정상 제목",
        summary: "가".repeat(321),
      }).success,
    ).toBe(false);
  });
});
