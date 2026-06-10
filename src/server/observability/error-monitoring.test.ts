import { describe, expect, it, vi } from "vitest";
import {
  createServerErrorEvent,
  getErrorMonitoringStatus,
  readErrorMonitoringConfig,
  reportServerError,
} from "@/server/observability/error-monitoring";

const config = {
  endpoint: "https://collector.example.com/events",
  environment: "staging",
  release: "release-123",
  timeoutMs: 3_000,
};

describe("error monitoring", () => {
  it("requires HTTPS for the collector endpoint", () => {
    expect(() =>
      readErrorMonitoringConfig({
        ERROR_MONITORING_ENDPOINT: "http://collector.example.com/events",
      }),
    ).toThrow("must use HTTPS");
  });

  it("reports missing configuration without exposing secrets", () => {
    expect(getErrorMonitoringStatus({ APP_ENV: "staging" })).toEqual({
      configured: false,
      valid: false,
      environment: "staging",
      release: undefined,
      detail: "ERROR_MONITORING_ENDPOINT is not configured.",
    });
  });

  it("removes query strings and fragments from request paths", () => {
    const event = createServerErrorEvent(
      new Error("boom"),
      {
        method: "POST",
        path: "/decks/123?email=user@example.com#private",
        routePath: "/decks/[id]?code=raw-deck-code",
      },
      config,
    );

    expect(event.request).toEqual({ method: "POST", path: "/decks/123" });
    expect(event.context.routePath).toBe("/decks/[id]");
    expect(JSON.stringify(event)).not.toContain("user@example.com");
    expect(JSON.stringify(event)).not.toContain("raw-deck-code");
  });

  it("does not throw when the external collector is unavailable", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetchImpl = vi.fn().mockRejectedValue(new Error("collector unavailable"));

    await expect(
      reportServerError(new Error("application failure"), {}, {
        env: {
          ERROR_MONITORING_ENDPOINT: config.endpoint,
          APP_ENV: config.environment,
        },
        fetchImpl,
      }),
    ).resolves.toBe(false);

    expect(fetchImpl).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("sends bearer authentication without adding request headers or bodies", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));

    await expect(
      reportServerError(new Error("application failure"), {
        method: "GET",
        path: "/decks?token=private",
      }, {
        env: {
          ERROR_MONITORING_ENDPOINT: config.endpoint,
          ERROR_MONITORING_TOKEN: "secret-token",
          APP_ENV: config.environment,
        },
        fetchImpl,
      }),
    ).resolves.toBe(true);

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers).toMatchObject({ authorization: "Bearer secret-token" });
    expect(init.body).not.toContain("private");
    expect(init.body).not.toContain("secret-token");
  });
});
