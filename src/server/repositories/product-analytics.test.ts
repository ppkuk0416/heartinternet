import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProductAnalyticsSummary } from "@/server/analytics/product-analytics-summary";

describe("product analytics summary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-08T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates funnel, daily, actor, and deck metrics", () => {
    const deckId = "11111111-1111-4111-8111-111111111111";
    const summary = buildProductAnalyticsSummary({
      rows: [
        {
          event_name: "deck_list_viewed",
          created_at: "2026-06-08T09:00:00Z",
          user_id: "user-1",
          anonymous_hash: null,
          deck_id: null,
        },
        {
          event_name: "deck_detail_viewed",
          created_at: "2026-06-08T09:01:00Z",
          user_id: "user-1",
          anonymous_hash: null,
          deck_id: deckId,
        },
        {
          event_name: "deck_code_copied",
          created_at: "2026-06-08T09:02:00Z",
          user_id: null,
          anonymous_hash: "a".repeat(64),
          deck_id: deckId,
        },
        {
          event_name: "deck_submit_started",
          created_at: "2026-06-07T09:00:00Z",
          user_id: null,
          anonymous_hash: "a".repeat(64),
          deck_id: null,
        },
        {
          event_name: "deck_preview_succeeded",
          created_at: "2026-06-07T09:01:00Z",
          user_id: null,
          anonymous_hash: "a".repeat(64),
          deck_id: null,
        },
      ],
      decksById: new Map([
        [deckId, { id: deckId, slug: "test-deck", title: "테스트 덱" }],
      ]),
      days: 7,
    });

    expect(summary.totalEvents).toBe(5);
    expect(summary.uniqueActors).toBe(2);
    expect(summary.eventCounts.deck_code_copied).toBe(1);
    expect(summary.funnel[1]).toMatchObject({
      label: "상세 -> 복사",
      fromCount: 1,
      toCount: 1,
      rate: 100,
    });
    expect(summary.daily.at(-1)).toMatchObject({
      date: "2026-06-08",
      events: 3,
      copies: 1,
    });
    expect(summary.topDecks[0]).toMatchObject({
      slug: "test-deck",
      title: "테스트 덱",
      detailViews: 1,
      copies: 1,
      copyRate: 100,
    });
  });
});
