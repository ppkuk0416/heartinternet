import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportReviewCard } from "@/components/admin/report-review-card";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("ReportReviewCard", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    refresh.mockClear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("submits a hide decision with an audit note", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "resolved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(
      <ReportReviewCard
        report={{
          id: "46d9ef4f-aa5e-4cf5-ab02-a331022f08ea",
          targetType: "comment",
          targetId: "target",
          targetLabel: "댓글 · 문제 내용",
          reason: "스팸·광고",
          reporterName: "신고자",
          createdAt: "2026. 6. 7.",
          status: "open",
        }}
      />,
    );

    fireEvent.change(screen.getByLabelText("처리 사유"), {
      target: { value: "스팸 댓글 확인" },
    });
    fireEvent.click(screen.getByRole("button", { name: "숨김" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/reports/46d9ef4f-aa5e-4cf5-ab02-a331022f08ea",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          decision: "hidden",
          note: "스팸 댓글 확인",
        }),
      }),
    );
  });
});
