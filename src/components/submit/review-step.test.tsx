import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReviewStep } from "@/components/submit/review-step";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReviewStep", () => {
  it("separates draft and publish intents in the final request", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "테스트 중단" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    render(
      <ReviewStep
        deckCode={"A".repeat(24)}
        className="전사"
        cardCount={30}
        guide={{
          title: "테스트 덱",
          summary: "충분히 긴 테스트 덱 요약을 작성하여 검토합니다.",
          recommendedFor: "복귀 유저",
          difficulty: "medium",
          gamePlan: "초반 필드를 잡고 중반부터 피해를 누적하는 운영입니다.",
          mulliganGuide: "저비용 카드를 우선해서 찾습니다.",
          cardChoices: "",
          matchupNotes: "",
        }}
        evidence={{
          sourceType: "ranked",
          sourceUrl: "https://example.com/source",
          sourceName: "본인 등급전",
          claimedRank: "전설 1000위",
          wins: 7,
          losses: 3,
          playedFrom: "",
          playedTo: "",
          evidenceNote: "",
        }}
        onBack={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "지금 공개" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
      intent: "publish",
      wins: 7,
      losses: 3,
      sourceUrl: "https://example.com/source",
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("테스트 중단");
  });
});
