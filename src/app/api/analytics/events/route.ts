import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requestAddress } from "@/server/analytics/deck-copy";
import {
  createAnonymousProductEventHash,
  ProductEventRequestSchema,
  sanitizeAnalyticsPath,
  sanitizeAnalyticsReferrer,
} from "@/server/analytics/product-events";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

const limiter = new FixedWindowRateLimiter(120, 10 * 60 * 1_000);

export async function POST(request: NextRequest) {
  const address = requestAddress(request.headers);
  if (!limiter.consume(address).allowed) {
    return NextResponse.json({ tracked: false }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ tracked: false }, { status: 400 });
  }

  const parsed = ProductEventRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ tracked: false }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return NextResponse.json({ tracked: false, reason: "unconfigured" });
  }
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({ tracked: false, reason: "unconfigured" });
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  let anonymousHash: string | null = null;
  if (!user) {
    const secret =
      process.env.ANALYTICS_EVENT_HASH_SECRET ?? process.env.COPY_EVENT_HASH_SECRET;
    if (!secret) {
      return NextResponse.json({
        tracked: false,
        reason: "anonymous_tracking_unconfigured",
      });
    }
    try {
      anonymousHash = createAnonymousProductEventHash({
        address,
        userAgent: request.headers.get("user-agent") ?? "",
        occurredOn: new Date().toISOString().slice(0, 10),
        secret,
      });
    } catch {
      return NextResponse.json({
        tracked: false,
        reason: "anonymous_tracking_unconfigured",
      });
    }
  }

  let deckId: string | null = null;
  if (parsed.data.deckSlug) {
    const { data: deck, error: deckError } = await client
      .from("decks")
      .select("id")
      .eq("slug", parsed.data.deckSlug)
      .eq("status", "published")
      .maybeSingle();
    if (deckError) return NextResponse.json({ tracked: false }, { status: 500 });
    deckId = deck?.id ?? null;
  }

  const { error } = await adminClient.from("product_events").insert({
    event_name: parsed.data.eventName,
    user_id: user?.id ?? null,
    anonymous_hash: user ? null : anonymousHash,
    deck_id: deckId,
    path: sanitizeAnalyticsPath(parsed.data.path) ?? null,
    referrer: sanitizeAnalyticsReferrer(parsed.data.referrer) ?? null,
    metadata: parsed.data.metadata,
  });

  if (error) {
    return NextResponse.json({ tracked: false }, { status: 500 });
  }

  return NextResponse.json({ tracked: true });
}
