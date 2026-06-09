import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OfficialEventImportPanel } from "@/components/admin/official-event-import-panel";

const validManifest = JSON.stringify(
  {
    event: {
      newsId: "24276663",
      officialUrl:
        "https://news.blizzard.com/en-us/article/24276663/the-hearthstone-spring-championship-is-here",
      name: "2026 Hearthstone Spring Championship",
      patchVersion: "35.6",
    },
    submissions: [
      {
        externalId: "player-1",
        playerName: "Player One",
        deckCode: "AAECAf0GAA==",
      },
    ],
  },
  null,
  2,
);

const summary = {
  eventVerification: {
    newsId: "24276663",
    officialUrl:
      "https://news.blizzard.com/en-us/article/24276663/the-hearthstone-spring-championship-is-here",
    title: "The Hearthstone Spring Championship Is Here",
    category: "Esports",
  },
  source: {
    slug: "blizzard-spring-championship-2026",
    name: "Blizzard Esports",
    sourceType: "tournament",
    trustTier: 3,
  },
  providerRevision: "blizzard-news-24276663-2026-06-05T00:00:00Z",
  candidates: 1,
  fullyValidated: 1,
  validationFailed: 0,
  codeProvenance: "operator_manifest",
  warningCount: 0,
  warnings: [],
};

describe("OfficialEventImportPanel", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("dry-runs a manifest before enabling write", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ mode: "dry-run", summary }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    render(<OfficialEventImportPanel exampleManifest={validManifest} />);

    expect(
      screen.getByRole("button", { name: "검증 후 후보 큐에 저장" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "사전 검증" }));

    await waitFor(() =>
      expect(screen.getByText("The Hearthstone Spring Championship Is Here")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/official-events",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"write":false'),
      }),
    );
    expect(
      screen.getByRole("button", { name: "검증 후 후보 큐에 저장" }),
    ).toBeEnabled();
  });

  it("submits write mode after a clean dry-run", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ mode: "dry-run", summary }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            mode: "write",
            summary,
            result: { runId: "run-1", inserted: 1, updated: 0 },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    render(<OfficialEventImportPanel exampleManifest={validManifest} />);

    fireEvent.click(screen.getByRole("button", { name: "사전 검증" }));
    await screen.findByText("가능합니다. 후보 큐에 안전하게 저장할 수 있습니다.");

    fireEvent.click(screen.getByRole("button", { name: "검증 후 후보 큐에 저장" }));

    await screen.findByText("저장 완료");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/admin/official-events",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"write":true'),
      }),
    );
  });

  it("shows a JSON parse error without sending a request", async () => {
    render(<OfficialEventImportPanel exampleManifest="{broken" />);

    fireEvent.click(screen.getByRole("button", { name: "사전 검증" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "JSON 형식을 먼저 확인해주세요.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
