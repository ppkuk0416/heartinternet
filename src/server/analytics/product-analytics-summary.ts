import type { ProductEventName } from "@/components/analytics/product-event-tracker";

const EVENT_NAMES: ProductEventName[] = [
  "deck_list_viewed",
  "deck_detail_viewed",
  "deck_code_copied",
  "deck_submit_started",
  "deck_preview_succeeded",
  "deck_draft_created",
];

export type ProductAnalyticsSummary = {
  unavailable: boolean;
  windowDays: number;
  totalEvents: number;
  uniqueActors: number;
  truncated: boolean;
  eventCounts: Record<ProductEventName, number>;
  funnel: Array<{
    from: ProductEventName;
    to: ProductEventName;
    label: string;
    fromCount: number;
    toCount: number;
    rate: number | null;
  }>;
  daily: Array<{
    date: string;
    events: number;
    copies: number;
    submissions: number;
  }>;
  topDecks: Array<{
    deckId: string;
    slug: string;
    title: string;
    detailViews: number;
    copies: number;
    copyRate: number | null;
  }>;
};

export type ProductEventRow = {
  event_name: ProductEventName;
  created_at: string;
  user_id: string | null;
  anonymous_hash: string | null;
  deck_id: string | null;
};

export type AnalyticsDeckRow = {
  id: string;
  slug: string;
  title: string;
};

export function buildProductAnalyticsSummary({
  rows,
  decksById = new Map(),
  days = 7,
  truncated = false,
  unavailable = false,
}: {
  rows: ProductEventRow[];
  decksById?: Map<string, AnalyticsDeckRow>;
  days?: number;
  truncated?: boolean;
  unavailable?: boolean;
}): ProductAnalyticsSummary {
  const eventCounts = Object.fromEntries(
    EVENT_NAMES.map((eventName) => [eventName, 0]),
  ) as Record<ProductEventName, number>;
  const actors = new Set<string>();
  const dailyByDate = new Map<
    string,
    { date: string; events: number; copies: number; submissions: number }
  >();
  const deckStats = new Map<
    string,
    { deckId: string; detailViews: number; copies: number }
  >();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1_000)
      .toISOString()
      .slice(0, 10);
    dailyByDate.set(date, { date, events: 0, copies: 0, submissions: 0 });
  }

  for (const row of rows) {
    if (row.event_name in eventCounts) eventCounts[row.event_name] += 1;
    const actor = row.user_id
      ? `u:${row.user_id}`
      : row.anonymous_hash
        ? `a:${row.anonymous_hash}`
        : null;
    if (actor) actors.add(actor);

    const date = row.created_at.slice(0, 10);
    const daily = dailyByDate.get(date);
    if (daily) {
      daily.events += 1;
      if (row.event_name === "deck_code_copied") daily.copies += 1;
      if (row.event_name === "deck_submit_started") daily.submissions += 1;
    }

    if (
      row.deck_id &&
      (row.event_name === "deck_detail_viewed" ||
        row.event_name === "deck_code_copied")
    ) {
      const stat =
        deckStats.get(row.deck_id) ??
        { deckId: row.deck_id, detailViews: 0, copies: 0 };
      if (row.event_name === "deck_detail_viewed") stat.detailViews += 1;
      if (row.event_name === "deck_code_copied") stat.copies += 1;
      deckStats.set(row.deck_id, stat);
    }
  }

  const topDecks = [...deckStats.values()]
    .map((stat) => {
      const deck = decksById.get(stat.deckId);
      return {
        deckId: stat.deckId,
        slug: deck?.slug ?? "",
        title: deck?.title ?? "삭제되었거나 비공개인 덱",
        detailViews: stat.detailViews,
        copies: stat.copies,
        copyRate: rate(stat.copies, stat.detailViews),
      };
    })
    .sort((a, b) => b.copies - a.copies || b.detailViews - a.detailViews)
    .slice(0, 8);

  return {
    unavailable,
    windowDays: days,
    totalEvents: rows.length,
    uniqueActors: actors.size,
    truncated,
    eventCounts,
    funnel: [
      funnelStep("deck_list_viewed", "deck_detail_viewed", "목록 -> 상세", eventCounts),
      funnelStep("deck_detail_viewed", "deck_code_copied", "상세 -> 복사", eventCounts),
      funnelStep(
        "deck_submit_started",
        "deck_preview_succeeded",
        "등록 시작 -> 코드 검증",
        eventCounts,
      ),
      funnelStep(
        "deck_preview_succeeded",
        "deck_draft_created",
        "코드 검증 -> 저장",
        eventCounts,
      ),
    ],
    daily: [...dailyByDate.values()],
    topDecks,
  };
}

function funnelStep(
  from: ProductEventName,
  to: ProductEventName,
  label: string,
  eventCounts: Record<ProductEventName, number>,
) {
  return {
    from,
    to,
    label,
    fromCount: eventCounts[from],
    toCount: eventCounts[to],
    rate: rate(eventCounts[to], eventCounts[from]),
  };
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}
