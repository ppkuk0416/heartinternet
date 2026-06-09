import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckCandidateReviewCard } from "@/components/admin/deck-candidate-review-card";
import type {
  DeckCandidateQueueItem,
  DeckLinkTarget,
} from "@/server/repositories/deck-candidates";

const baseCandidate: DeckCandidateQueueItem = {
  id: "30000000-0000-4000-8000-000000000001",
  status: "ready_for_review",
  priorityScore: 92,
  title: "테스트 대회 덱",
  playerName: "테스트 선수",
  eventName: "테스트 대회",
  claimedRank: null,
  sourceUrl: "https://example.com/deck",
  sourcePublishedAt: "2026-06-07T00:00:00Z",
  rawDeckCode: "AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=",
  codeHash: "a".repeat(64),
  codeValidationStatus: "valid",
  codeValidationIssues: [],
  format: "standard",
  wins: 7,
  losses: 2,
  observedCount: 3,
  firstSeenAt: "2026-06-07T00:00:00Z",
  lastSeenAt: "2026-06-07T01:00:00Z",
  source: { name: "공식 테스트", type: "tournament", trustTier: 3 },
  className: "전사",
  patchVersion: "35.6",
  currentPatch: true,
};

const targets: DeckLinkTarget[] = [
  {
    id: "30000000-0000-4000-8000-000000000002",
    slug: "matching-deck",
    title: "동일 코드 공개 덱",
    className: "전사",
    codeHash: "a".repeat(64),
  },
];

describe("DeckCandidateReviewCard", () => {
  it("preselects an exact code match for moderator review", () => {
    render(
      <DeckCandidateReviewCard candidate={baseCandidate} linkTargets={targets} />,
    );

    expect(screen.getByText("동일한 코드의 공개 덱을 자동으로 찾았습니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("연결할 공개 덱")).toHaveValue(targets[0]?.id);
    expect(screen.getByRole("button", { name: "공개 덱 연결" })).toBeEnabled();
  });

  it("blocks approve and link actions when the candidate has no deck code", () => {
    render(
      <DeckCandidateReviewCard
        candidate={{
          ...baseCandidate,
          status: "needs_code",
          rawDeckCode: null,
          codeHash: null,
          codeValidationStatus: "not_supplied",
        }}
        linkTargets={targets}
      />,
    );

    expect(screen.getByRole("button", { name: "검증 승인" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "공개 덱 연결" })).toBeDisabled();
    expect(screen.getByText(/덱 코드가 없어 승인·연결할 수 없습니다/)).toBeInTheDocument();
  });

  it("shows the curated draft form after moderator approval", () => {
    render(
      <DeckCandidateReviewCard
        candidate={{ ...baseCandidate, status: "approved" }}
        linkTargets={targets}
      />,
    );

    expect(screen.getByText("승인 완료 · 신규 초안 생성")).toBeInTheDocument();
    expect(screen.getByLabelText("큐레이션 제목")).toHaveValue("테스트 대회 덱");
    expect(screen.getByLabelText("초기 요약")).toHaveValue(
      "테스트 선수가 공식 테스트에 공유한 현재 패치 전사 덱을 운영진이 검토 중입니다.",
    );
    expect(
      screen.getByRole("button", { name: "초안 만들고 가이드 작성" }),
    ).toBeEnabled();
  });
});
