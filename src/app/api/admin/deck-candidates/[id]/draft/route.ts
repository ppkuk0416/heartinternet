import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CandidateDraftRequestSchema } from "@/server/deck-tracking/candidate-draft-schema";
import {
  decodeDeckstring,
  DECKSTRING_PARSER_VERSION,
} from "@/server/deckstrings/adapter";
import { createDeckPreviewFromDecoded } from "@/server/deckstrings/preview";
import { resolveCardCatalog } from "@/server/repositories/card-catalog";

const MAX_BODY_BYTES = 2_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return response("입력 크기가 너무 큽니다.", 413);

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return response("로그인이 필요합니다.", 401);

  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "moderator" && profile?.role !== "admin") {
    return response("운영진 권한이 필요합니다.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response("JSON 요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = CandidateDraftRequestSchema.safeParse(body);
  if (!parsed.success) return response("초안 제목과 요약을 확인해주세요.", 400);

  const { id } = await params;
  const { data: candidate, error: candidateError } = await client
    .from("deck_candidates")
    .select("id,status,raw_deck_code,code_hash,code_validation_status")
    .eq("id", id)
    .maybeSingle();
  if (candidateError || !candidate) return response("승인 후보를 찾을 수 없습니다.", 404);
  if (
    candidate.status !== "approved" ||
    candidate.code_validation_status !== "valid" ||
    !candidate.raw_deck_code
  ) {
    return response("검증 승인된 후보만 초안으로 만들 수 있습니다.", 409);
  }

  try {
    const decoded = decodeDeckstring(candidate.raw_deck_code);
    if (decoded.codeHash !== candidate.code_hash) {
      return response("후보 덱 코드 해시가 일치하지 않습니다.", 409);
    }
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
    if (!preview.validation.publishable || !preview.validation.heroClassSlug) {
      return NextResponse.json(
        {
          error: "현재 카드 데이터에서는 이 후보로 초안을 만들 수 없습니다.",
          issues: preview.validation.issues,
        },
        { status: 422 },
      );
    }

    const cards = [
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
    const { data, error } = await client.rpc("create_deck_candidate_draft", {
      target_candidate_id: id,
      p_title: parsed.data.title,
      p_summary: parsed.data.summary,
      p_recommended_for: "",
      p_difficulty: "medium",
      p_game_plan: "",
      p_mulligan_guide: "",
      p_card_choices: "",
      p_matchup_notes: "",
      p_parser_version: DECKSTRING_PARSER_VERSION,
      p_class_slug: preview.validation.heroClassSlug,
      p_hero_dbf_id: decoded.heroDbfIds[0],
      p_cards: cards,
    });
    if (error) {
      const duplicate = error.message.includes("already uses this code");
      return response(
        duplicate
          ? "같은 코드의 덱이 이미 존재합니다. 기존 공개 덱 연결을 사용해주세요."
          : "큐레이션 초안을 생성하지 못했습니다.",
        duplicate ? 409 : 500,
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
  } catch {
    return response("후보 덱 코드를 다시 검증하지 못했습니다.", 422);
  }
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
