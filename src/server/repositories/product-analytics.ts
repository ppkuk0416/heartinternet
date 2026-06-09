import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildProductAnalyticsSummary,
  type AnalyticsDeckRow,
  type ProductAnalyticsSummary,
  type ProductEventRow,
} from "@/server/analytics/product-analytics-summary";

const MAX_EVENTS = 5_000;

export async function getProductAnalyticsSummary({
  days = 7,
  client,
}: {
  days?: number;
  client?: SupabaseClient;
} = {}): Promise<ProductAnalyticsSummary> {
  const supabase = client ?? (await createServerSupabaseClient());
  if (!supabase) return emptySummary(days, true);

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1_000).toISOString();
  const { data, error } = await supabase
    .from("product_events")
    .select("event_name,created_at,user_id,anonymous_hash,deck_id")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_EVENTS + 1);

  if (error) return emptySummary(days, true);

  const rows = ((data ?? []) as unknown as ProductEventRow[]).slice(0, MAX_EVENTS);
  const deckIds = [
    ...new Set(rows.flatMap((row) => (row.deck_id ? [row.deck_id] : []))),
  ];
  let decksById = new Map<string, AnalyticsDeckRow>();

  if (deckIds.length > 0) {
    const { data: decks } = await supabase
      .from("decks")
      .select("id,slug,title")
      .in("id", deckIds);
    decksById = new Map(
      ((decks ?? []) as unknown as AnalyticsDeckRow[]).map((deck) => [
        deck.id,
        deck,
      ]),
    );
  }

  return buildProductAnalyticsSummary({
    rows,
    decksById,
    days,
    truncated: (data?.length ?? 0) > MAX_EVENTS,
  });
}

function emptySummary(days: number, unavailable: boolean): ProductAnalyticsSummary {
  return buildProductAnalyticsSummary({
    rows: [],
    days,
    unavailable,
  });
}
