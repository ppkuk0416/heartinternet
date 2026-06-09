import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeckReactions } from "@/components/deck/deck-reactions";

describe("DeckReactions", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("persists a recommendation and renders the authoritative count", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ active: true, count: 13 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <DeckReactions
        slug="test-deck"
        authenticated
        initialRecommended={false}
        initialFavorited={false}
        initialRecommendationCount={12}
        initialFavoriteCount={3}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "추천 12" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "추천 13" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public-decks/test-deck/reactions/recommendation",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ active: true }),
      }),
    );
  });

  it("shows an API error without changing the displayed state", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "저장 실패" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <DeckReactions
        slug="test-deck"
        authenticated
        initialRecommended={false}
        initialFavorited={false}
        initialRecommendationCount={12}
        initialFavoriteCount={3}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "저장 3" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("저장 실패");
    expect(screen.getByRole("button", { name: "저장 3" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
