import { describe, expect, it } from "vitest";
import { buildOperationsStatusSummary } from "@/server/operations/status-summary";

const baseInput = {
  generatedAt: "2026-06-08T12:00:00Z",
  tracking: {
    recentRuns: 3,
    failedRuns: 0,
    runningRuns: 0,
    staleActiveSources: 0,
    activeSources: 2,
  },
  moderation: {
    openReports: 0,
    reviewingReports: 0,
  },
  content: {
    reviewCandidates: 4,
    needsValidationCandidates: 0,
    staleCandidates: 1,
  },
  cards: {
    latestStatus: "succeeded" as const,
    latestFinishedAt: "2026-06-08T10:00:00Z",
  },
  patch: {
    currentVersion: "35.6",
    requiresCardReview: false,
  },
  analytics: {
    events24h: 12,
  },
  monitoring: {
    configured: true,
    valid: true,
    environment: "staging",
    release: "release-123",
    detail: "HTTPS error collector is configured.",
  },
};

describe("operations status summary", () => {
  it("reports ok when core operational signals are healthy", () => {
    const summary = buildOperationsStatusSummary(baseInput);

    expect(summary.overall).toBe("ok");
    expect(summary.cards.find((card) => card.key === "tracking")).toMatchObject({
      severity: "ok",
      value: "3회",
    });
    expect(summary.cards.find((card) => card.key === "monitoring")).toMatchObject({
      severity: "ok",
      value: "연결 설정",
    });
  });

  it("escalates failed collection and required card review", () => {
    const summary = buildOperationsStatusSummary({
      ...baseInput,
      tracking: {
        ...baseInput.tracking,
        failedRuns: 1,
      },
      patch: {
        currentVersion: "36.0",
        latestTransitionAt: "2026-06-08T11:00:00Z",
        requiresCardReview: true,
      },
    });

    expect(summary.overall).toBe("critical");
    expect(summary.cards.find((card) => card.key === "tracking")?.severity).toBe(
      "critical",
    );
    expect(summary.cards.find((card) => card.key === "patch")?.severity).toBe(
      "critical",
    );
  });

  it("warns when analytics events stop arriving", () => {
    const summary = buildOperationsStatusSummary({
      ...baseInput,
      analytics: { events24h: 0 },
    });

    expect(summary.overall).toBe("warning");
    expect(summary.cards.find((card) => card.key === "analytics")).toMatchObject({
      severity: "warning",
      detail: "최근 24시간 제품 이벤트가 없습니다.",
    });
  });

  it("warns when error monitoring is not configured", () => {
    const summary = buildOperationsStatusSummary({
      ...baseInput,
      monitoring: {
        configured: false,
        valid: false,
        environment: "production",
        detail: "ERROR_MONITORING_ENDPOINT is not configured.",
      },
    });

    expect(summary.overall).toBe("warning");
    expect(summary.cards.find((card) => card.key === "monitoring")).toMatchObject({
      severity: "warning",
      value: "설정 필요",
    });
  });
});
