import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeckEditForm } from "@/components/deck/deck-edit-form";

const deck = {
  id: "30000000-0000-4000-8000-000000000010",
  title: "큐레이션 전사 덱",
  summary: "현재 패치에서 확인된 전사 덱을 운영진이 정리한 가이드입니다.",
  recommended_for: "최신 덱을 빠르게 시험하려는 등급전 유저",
  difficulty: "medium" as const,
  game_plan: "초반 필드를 지키고 중반부터 자원 우위로 압박하는 운영을 합니다.",
  mulligan_guide: "초반에 사용할 수 있는 저비용 하수인을 우선해서 찾습니다.",
  card_choices: null,
  matchup_notes: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DeckEditForm", () => {
  it("saves the publication-ready guide through the owner draft API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DeckEditForm deck={deck} />);

    fireEvent.change(screen.getByLabelText(/덱 이름/), {
      target: { value: "최신 큐레이션 전사 덱" },
    });
    fireEvent.change(screen.getByLabelText(/카드 선택 설명/), {
      target: { value: "현재 메타의 빠른 덱을 고려해 방어 카드를 채용했습니다." },
    });
    fireEvent.click(screen.getByRole("button", { name: "가이드 저장" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: expect.any(String),
      });
    });

    const request = fetchMock.mock.calls[0]?.[1];
    expect(JSON.parse(request.body)).toEqual(
      expect.objectContaining({
        title: "최신 큐레이션 전사 덱",
        difficulty: "medium",
        cardChoices: "현재 메타의 빠른 덱을 고려해 방어 카드를 채용했습니다.",
      }),
    );
    expect(
      await screen.findByText("공개 가능한 가이드 내용을 저장했습니다."),
    ).toBeInTheDocument();
  });

  it("shows the API error and restores the save action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "초안 소유자만 수정할 수 있습니다." }),
      }),
    );

    render(<DeckEditForm deck={deck} />);
    fireEvent.click(screen.getByRole("button", { name: "가이드 저장" }));

    expect(
      await screen.findByText("초안 소유자만 수정할 수 있습니다."),
    ).toHaveAttribute("role", "alert");
    expect(screen.getByRole("button", { name: "가이드 저장" })).toBeEnabled();
  });
});
