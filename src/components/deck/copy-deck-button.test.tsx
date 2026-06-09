import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyDeckButton } from "@/components/deck/copy-deck-button";

describe("CopyDeckButton", () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const fetchMock = vi.fn().mockResolvedValue(new Response());

  beforeEach(() => {
    writeText.mockClear();
    fetchMock.mockClear();
    vi.stubGlobal("fetch", fetchMock);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
  });

  it("copies the exact deck code and confirms success", async () => {
    render(<CopyDeckButton code="DEMO-DECK-CODE" />);

    fireEvent.click(screen.getByRole("button", { name: "덱 코드 복사" }));

    expect(writeText).toHaveBeenCalledWith("DEMO-DECK-CODE");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "복사했어요" }),
      ).toBeInTheDocument(),
    );
  });

  it("records a successful public deck copy without waiting for analytics", async () => {
    render(
      <CopyDeckButton code="DEMO-DECK-CODE" trackingSlug="example-deck" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "덱 코드 복사" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/public-decks/example-deck/copy",
        expect.objectContaining({ method: "POST", keepalive: true }),
      ),
    );
  });
});
