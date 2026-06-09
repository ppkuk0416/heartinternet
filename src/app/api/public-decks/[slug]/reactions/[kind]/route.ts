import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

const RequestSchema = z.object({ active: z.boolean() });
const limiter = new FixedWindowRateLimiter(40, 10 * 60 * 1_000);
const SLUG = /^[a-z0-9][a-z0-9-]{2,119}$/;
const KINDS = {
  recommendation: {
    table: "deck_likes",
  },
  favorite: {
    table: "favorites",
  },
} as const;

export async function POST(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ slug: string; kind: string }> },
) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.consume(key).allowed) return response("잠시 후 다시 시도해주세요.", 429);

  const { slug, kind } = await params;
  const config = KINDS[kind as keyof typeof KINDS];
  if (!SLUG.test(slug) || !config) return response("요청을 확인해주세요.", 400);

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return response("로그인이 필요합니다.", 401);

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return response("JSON 요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = RequestSchema.safeParse(input);
  if (!parsed.success) return response("요청을 확인해주세요.", 400);

  const { data: deck } = await client
    .from("decks")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!deck) return response("공개 덱을 찾을 수 없습니다.", 404);

  const mutation = parsed.data.active
    ? await client
        .from(config.table)
        .upsert(
          { deck_id: deck.id, user_id: user.id },
          { onConflict: "user_id,deck_id", ignoreDuplicates: true },
        )
    : await client
        .from(config.table)
        .delete()
        .eq("deck_id", deck.id)
        .eq("user_id", user.id);
  if (mutation.error) return response("반응을 저장하지 못했습니다.", 500);

  const { data: updated, error: countError } = await client
    .from("decks")
    .select("recommendation_count,favorite_count")
    .eq("id", deck.id)
    .single();
  if (countError) return response("반응 수를 확인하지 못했습니다.", 500);

  return NextResponse.json({
    active: parsed.data.active,
    count: Number(
      kind === "recommendation"
        ? updated.recommendation_count
        : updated.favorite_count,
    ),
  });
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
