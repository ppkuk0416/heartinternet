import { describe, expect, it } from "vitest";
import {
  createAnonymousProductEventHash,
  ProductEventRequestSchema,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
} from "@/server/analytics/product-events";

const secret = "a-product-analytics-secret-longer-than-32-characters";

describe("product analytics events", () => {
  it("accepts only the MVP funnel event contract", () => {
    expect(
      ProductEventRequestSchema.safeParse({
        eventName: "deck_detail_viewed",
        deckSlug: "rainbow-dk-guide",
        path: "/decks/rainbow-dk-guide",
        metadata: {
          className: "죽음의 기사",
          queryPresent: false,
          total: 12,
          empty: null,
        },
      }).success,
    ).toBe(true);

    expect(
      ProductEventRequestSchema.safeParse({
        eventName: "raw_deck_code_submitted",
        metadata: {
          deckCode: "AAECA...",
        },
      }).success,
    ).toBe(false);
  });

  it("uses a daily anonymous hash without exposing the raw address", () => {
    const first = createAnonymousProductEventHash({
      address: "203.0.113.7",
      userAgent: "Example Browser",
      occurredOn: "2026-06-08",
      secret,
    });
    const nextDay = createAnonymousProductEventHash({
      address: "203.0.113.7",
      userAgent: "Example Browser",
      occurredOn: "2026-06-09",
      secret,
    });

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("203.0.113.7");
    expect(nextDay).not.toBe(first);
  });

  it("keeps only first-party paths and origin-level referrers", () => {
    expect(sanitizeAnalyticsPath("/decks?sort=trending")).toBe(
      "/decks?sort=trending",
    );
    expect(sanitizeAnalyticsPath("https://example.com/decks")).toBeUndefined();
    expect(sanitizeAnalyticsPath("//example.com/decks")).toBeUndefined();

    expect(
      sanitizeAnalyticsReferrer("https://google.com/search?q=secret+query"),
    ).toBe("https://google.com/search");
    expect(sanitizeAnalyticsReferrer("not a url")).toBeUndefined();
  });
});
