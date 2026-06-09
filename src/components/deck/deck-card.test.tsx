import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DeckCard } from "@/components/deck/deck-card";
import { decks } from "@/lib/decks";

describe("DeckCard", () => {
  it("explains a tracked deck with its recent independent source count", () => {
    render(<DeckCard deck={decks[0]!} />);

    expect(
      screen.getByText("최근 14일 · 3개 출처 확인"),
    ).toBeInTheDocument();
  });

  it("does not imply tracking evidence for an untracked deck", () => {
    render(<DeckCard deck={decks[2]!} />);

    expect(screen.queryByText(/개 출처 확인/)).not.toBeInTheDocument();
  });
});
