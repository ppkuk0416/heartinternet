import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  candidateCanUseDeckCode,
  DeckCandidateDecisionSchema,
} from "@/server/deck-tracking/review-schema";

const MAX_BODY_BYTES = 2_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return response("검토 입력이 너무 큽니다.", 413);
  }

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);

  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) return response("로그인이 필요합니다.", 401);

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

  const parsed = DeckCandidateDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "검토 입력을 확인해주세요.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { data: candidate, error: candidateError } = await client
    .from("deck_candidates")
    .select("id,status,code_validation_status")
    .eq("id", id)
    .maybeSingle();
  if (candidateError || !candidate) return response("후보 덱을 찾을 수 없습니다.", 404);

  if (
    (parsed.data.decision === "approved" ||
      parsed.data.decision === "linked") &&
    !candidateCanUseDeckCode(candidate.code_validation_status)
  ) {
    return response("검증된 덱 코드가 있어야 승인하거나 연결할 수 있습니다.", 409);
  }

  if (parsed.data.decision === "linked") {
    const { data: targetDeck } = await client
      .from("decks")
      .select("id")
      .eq("id", parsed.data.targetDeckId!)
      .eq("status", "published")
      .not("current_deck_code_id", "is", null)
      .maybeSingle();
    if (!targetDeck) return response("연결할 공개 덱을 찾을 수 없습니다.", 409);
  }

  const { data, error } = await client.rpc("review_deck_candidate", {
    target_candidate_id: id,
    decision: parsed.data.decision,
    target_deck_id: parsed.data.targetDeckId ?? null,
    decision_note: parsed.data.note ?? null,
  });
  if (error) {
    console.error("Deck candidate review failed:", error.message);
    return response("검토 결과를 저장하지 못했습니다.", 500);
  }

  return NextResponse.json({
    candidateId: id,
    status: Array.isArray(data) ? data[0]?.status : data?.status,
  });
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
