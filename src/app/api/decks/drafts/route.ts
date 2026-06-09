import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  decodeDeckstring,
  DECKSTRING_PARSER_VERSION,
} from "@/server/deckstrings/adapter";
import { DeckstringError } from "@/server/deckstrings/errors";
import { createDeckPreviewFromDecoded } from "@/server/deckstrings/preview";
import { DeckDraftRequestSchema } from "@/server/decks/draft-schema";
import { FixedWindowRateLimiter } from "@/server/rate-limit";
import { resolveCardCatalog } from "@/server/repositories/card-catalog";

const MAX_BODY_BYTES = 20_000;
const limiter = new FixedWindowRateLimiter(10, 10 * 60 * 1_000);

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return response("입력 크기가 너무 큽니다.", 413);
  }

  const rate = limiter.consume(clientKey(request));
  if (!rate.allowed) {
    return response("초안 저장 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return response("로그인이 필요합니다.", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response("JSON 요청 형식이 올바르지 않습니다.", 400);
  }

  const parsed = DeckDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "필수 가이드 내용을 확인해주세요.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    const decoded = decodeDeckstring(parsed.data.deckCode);
    const requiredIds = [
      ...decoded.heroDbfIds,
      ...decoded.cards.map((card) => card.dbfId),
      ...decoded.sideboardCards.flatMap((card) => [
        card.dbfId,
        card.ownerDbfId,
      ]),
    ];
    const resolved = await resolveCardCatalog(requiredIds);
    const preview = createDeckPreviewFromDecoded(decoded, resolved.catalog);

    if (!preview.validation.publishable || !preview.validation.heroClassSlug) {
      return NextResponse.json(
        {
          error: "현재 게시 가능한 정규전 덱 코드가 아닙니다.",
          issues: preview.validation.issues,
        },
        { status: 422 },
      );
    }

    const rpcCards = [
      ...decoded.cards.map((card) => ({
        dbf_id: card.dbfId,
        quantity: card.quantity,
        owner_dbf_id: null,
      })),
      ...decoded.sideboardCards.map((card) => ({
        dbf_id: card.dbfId,
        quantity: card.quantity,
        owner_dbf_id: card.ownerDbfId,
      })),
    ];
    const { data, error } = await client.rpc("create_deck_submission", {
      p_title: parsed.data.title,
      p_summary: parsed.data.summary,
      p_recommended_for: parsed.data.recommendedFor,
      p_difficulty: parsed.data.difficulty,
      p_game_plan: parsed.data.gamePlan,
      p_mulligan_guide: parsed.data.mulliganGuide,
      p_card_choices: parsed.data.cardChoices,
      p_matchup_notes: parsed.data.matchupNotes,
      p_raw_code: decoded.canonicalCode,
      p_code_hash: decoded.codeHash,
      p_parser_version: DECKSTRING_PARSER_VERSION,
      p_class_slug: preview.validation.heroClassSlug,
      p_hero_dbf_id: decoded.heroDbfIds[0],
      p_cards: rpcCards,
      p_source_type: parsed.data.sourceType,
      p_source_url: parsed.data.sourceUrl,
      p_source_name: parsed.data.sourceName,
      p_claimed_rank: parsed.data.claimedRank,
      p_wins: parsed.data.wins,
      p_losses: parsed.data.losses,
      p_played_from: parsed.data.playedFrom || null,
      p_played_to: parsed.data.playedTo || null,
      p_evidence_note: parsed.data.evidenceNote,
      p_publish: parsed.data.intent === "publish",
    });

    if (error) {
      const catalogMissing = error.message.includes("synced catalog");
      return response(
        catalogMissing
          ? "카드 DB 동기화가 필요해 초안을 저장하지 못했습니다."
          : "초안을 저장하지 못했습니다.",
        catalogMissing ? 409 : 500,
      );
    }

    const draft = Array.isArray(data) ? data[0] : data;
    return NextResponse.json(
      {
        deckId: draft?.deck_id,
        slug: draft?.deck_slug,
        status: draft?.deck_status,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof DeckstringError) {
      return response(error.message, 400);
    }
    return response("초안을 저장하는 중 오류가 발생했습니다.", 500);
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
