import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getErrorMonitoringConfig,
  reportServerError,
} from "@/server/observability/error-monitoring";

const baseReport = {
  error: Object.assign(new Error("database unavailable"), { digest: "abc123" }),
  request: { method: "GET", path: "/decks/test?token=secret" },
  context: {
    routerKind: "App Router",
    routePath: "/decks/[slug]",
    routeType: "render",
    renderSource: "server-rendering",
  },
};

afterEach(() => vi.restoreAllMocks());

describe("error monitoring", () => {
  it("rejects missing and insecure remote endpoints", () => {
    expect(getErrorMonitoringConfig({})).toBeNull();
    expect(
      getErrorMonitoringConfig({ ERROR_MONITORING_ENDPOINT: "http://example.com" }),
    ).toBeNull();
  });

  it("sends a bounded privacy-safe server error payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

    const result = await reportServerError(baseReport, {
      env: {
        ERROR_MONITORING_ENDPOINT: "https://errors.example.com/events",
        ERROR_MONITORING_TOKEN: "test-token",
        APP_ENV: "staging",
        APP_RELEASE: "release-123",
      },
      fetcher,
      occurredAt: "2026-06-09T15:00:00.000Z",
    });

    expect(result).toBe("sent");
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe("https://errors.example.com/events");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
    expect(JSON.parse(init.body)).toMatchObject({
      environment: "staging",
      release: "release-123",
      occurredAt: "2026-06-09T15:00:00.000Z",
      error: { message: "database unavailable", digest: "abc123" },
      request: { method: "GET", path: "/decks/test" },
      context: { routePath: "/decks/[slug]", routeType: "render" },
    });
    expect(init.body).not.toContain("secret");
  });

  it("never propagates collector failures into the user request", async () => {
    const result = await reportServerError(baseReport, {
      env: { ERROR_MONITORING_ENDPOINT: "https://errors.example.com/events" },
      fetcher: vi.fn().mockRejectedValue(new Error("network down")),
    });

    expect(result).toBe("failed");
  });
});
