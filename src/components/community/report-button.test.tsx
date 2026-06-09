import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportButton } from "@/components/community/report-button";

describe("ReportButton", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("submits a structured deck report", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ reported: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <ReportButton
        target={{ targetType: "deck", deckSlug: "test-deck" }}
        authenticated
        returnPath="/decks/test-deck"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "신고" }));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "false_claim" },
    });
    fireEvent.click(screen.getByRole("button", { name: "신고 접수" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "신고를 접수했습니다.",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports",
      expect.objectContaining({
        body: expect.stringContaining('"reason":"false_claim"'),
      }),
    );
  });
});
