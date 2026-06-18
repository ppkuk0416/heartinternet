import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeckDiscussion } from "@/components/community/deck-discussion";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("DeckDiscussion", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    refresh.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("creates a comment and refreshes the server-rendered discussion", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "comment-id" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <DeckDiscussion
        slug="test-deck"
        comments={[]}
        authenticated
        unavailable={false}
      />,
    );

    fireEvent.change(
      screen.getByLabelText("사용 경험이나 교체 카드 의견"),
      { target: { value: "멀리건에서 1비용 카드를 우선했습니다." } },
    );
    fireEvent.click(screen.getByRole("button", { name: "댓글 남기기" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-decks/test-deck/comments",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("deletes only a comment marked as owned by the viewer", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ deleted: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <DeckDiscussion
        slug="test-deck"
        authenticated
        unavailable={false}
        comments={[
          {
            id: "46d9ef4f-aa5e-4cf5-ab02-a331022f08ea",
            body: "좋은 운영 팁입니다.",
            authorName: "테스터",
            createdAt: "2026. 6. 7.",
            canDelete: true,
            canReact: false,
            helpful: false,
            helpfulCount: 0,
          },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/comments/46d9ef4f-aa5e-4cf5-ab02-a331022f08ea",
        { method: "DELETE" },
      ),
    );
  });
});
