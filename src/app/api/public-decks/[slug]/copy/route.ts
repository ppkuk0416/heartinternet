import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  createAnonymousDeckCopyHash,
  requestAddress,
} from "@/server/analytics/deck-copy";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

const limiter = new FixedWindowRateLimiter(60, 10 * 60 * 1_000);
const SLUG = /^[a-z0-9][a-z0-9-]{2,119}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const address = requestAddress(request.headers);
  if (!limiter.consume(address).allowed) {
    return NextResponse.json({ tracked: false }, { status: 429 });
  }

  const { slug } = await params;
  if (!SLUG.test(slug)) {
    return NextResponse.json({ tracked: false }, { status: 400 });
  }

  const client = await createServerSupabaseClient();
  if (!client) {
    return NextResponse.json({ tracked: false, reason: "unconfigured" });
  }

  const { data: deck, error: deckError } = await client
    .from("decks")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (deckError || !deck) {
    return NextResponse.json({ tracked: false }, { status: 404 });
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  const adminClient = createAdminSupabaseClient();
  if (!adminClient) {
    return NextResponse.json({
      tracked: false,
      reason: "tracking_unconfigured",
    });
  }

  let anonymousHash: string | null = null;
  if (!user) {
    const secret = process.env.COPY_EVENT_HASH_SECRET;
    if (!secret) {
      return NextResponse.json({
        tracked: false,
        reason: "anonymous_tracking_unconfigured",
      });
    }
    try {
      anonymousHash = createAnonymousDeckCopyHash({
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

  const { data, error } = await adminClient.rpc("record_server_deck_copy", {
    target_deck_id: deck.id,
    attributed_user_id: user?.id ?? null,
    anonymous_visitor_hash: anonymousHash,
  });
  if (error) {
    return NextResponse.json({ tracked: false }, { status: 500 });
  }

  return NextResponse.json({ tracked: Boolean(data) });
}
