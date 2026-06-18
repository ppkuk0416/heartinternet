import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentHelpfulButton } from "@/components/community/comment-helpful-button";

describe("CommentHelpfulButton", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("stores a helpful reaction and renders the authoritative count", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ active: true, count: 5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <CommentHelpfulButton
        commentId="46d9ef4f-aa5e-4cf5-ab02-a331022f08ea"
        authenticated
        canReact
        initialActive={false}
        initialCount={4}
        returnPath="/decks/test#discussion"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "도움됨 4" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "도움됨 5" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/comments/46d9ef4f-aa5e-4cf5-ab02-a331022f08ea/helpful",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ active: true }),
      }),
    );
  });

  it("disables reactions on the viewer's own comment", () => {
    render(
      <CommentHelpfulButton
        commentId="46d9ef4f-aa5e-4cf5-ab02-a331022f08ea"
        authenticated
        canReact={false}
        initialActive={false}
        initialCount={0}
        returnPath="/decks/test#discussion"
      />,
    );

    expect(screen.getByRole("button", { name: "도움됨 0" })).toBeDisabled();
  });
});
