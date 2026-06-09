import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decodeDeckstring } from "@/server/deckstrings/adapter";
import { createDeckPreviewFromDecoded } from "@/server/deckstrings/preview";
import { FixedWindowRateLimiter } from "@/server/rate-limit";
import { resolveCardCatalog } from "@/server/repositories/card-catalog";

const limiter = new FixedWindowRateLimiter(10, 10 * 60 * 1_000);
type Params = Promise<{ id: string }>;

export async function POST(
  request: NextRequest,
  { params }: { params: Params },
) {
  if (!limiter.consume(clientKey(request)).allowed) {
    return response("공개 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return response("로그인이 필요합니다.", 401);

  const { id } = await params;
  const { data: deck, error: deckError } = await client
    .from("decks")
    .select(
      "id,author_id,status,current_deck_code_id,deck_codes!decks_current_deck_code_fk(raw_code)",
    )
    .eq("id", id)
    .eq("author_id", user.id)
    .eq("status", "draft")
    .maybeSingle();

  if (deckError || !deck) return response("공개할 초안을 찾지 못했습니다.", 404);
  const codeRelation = deck.deck_codes as
    | { raw_code?: string }
    | Array<{ raw_code?: string }>
    | null;
  const code = Array.isArray(codeRelation)
    ? codeRelation[0]?.raw_code
    : codeRelation?.raw_code;
  if (!code) return response("초안의 덱 코드를 찾지 못했습니다.", 409);

  try {
    const decoded = decodeDeckstring(code);
    const ids = [
      ...decoded.heroDbfIds,
      ...decoded.cards.map((card) => card.dbfId),
      ...decoded.sideboardCards.flatMap((card) => [
        card.dbfId,
        card.ownerDbfId,
      ]),
    ];
    const resolved = await resolveCardCatalog(ids);
    const preview = createDeckPreviewFromDecoded(decoded, resolved.catalog);
    if (!preview.validation.publishable) {
      return NextResponse.json(
        {
          error: "현재 카드 데이터에서는 이 초안을 공개할 수 없습니다.",
          issues: preview.validation.issues,
        },
        { status: 422 },
      );
    }

    const { data, error } = await client.rpc("publish_deck_draft", {
      p_deck_id: id,
    });
    if (error) return response("공개 조건을 다시 확인해주세요.", 409);
    const published = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      slug: published?.deck_slug,
      status: published?.deck_status,
    });
  } catch {
    return response("덱 코드를 다시 검증하지 못했습니다.", 422);
  }
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
