import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FavoriteDeckCard } from "@/components/my/favorite-deck-card";
import { decks } from "@/lib/decks";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("FavoriteDeckCard", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    refresh.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("removes a saved deck after the server confirms the mutation", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ active: false, count: 2 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<FavoriteDeckCard deck={decks[0]!} />);

    fireEvent.click(screen.getByRole("button", { name: "저장 해제" }));

    await waitFor(() =>
      expect(screen.queryByText(decks[0]!.title)).not.toBeInTheDocument(),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps the deck visible when removal fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "저장 실패" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<FavoriteDeckCard deck={decks[0]!} />);

    fireEvent.click(screen.getByRole("button", { name: "저장 해제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("저장 실패");
    expect(screen.getByText(decks[0]!.title)).toBeInTheDocument();
  });
});
