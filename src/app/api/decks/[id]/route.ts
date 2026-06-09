import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DeckEditRequestSchema } from "@/server/decks/edit-schema";

const MAX_BODY_BYTES = 20_000;

export async function PATCH(
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response("JSON 요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = DeckEditRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "공개 가능한 수준으로 가이드 내용을 완성해주세요.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { data, error } = await client
    .from("decks")
    .update({
      title: parsed.data.title,
      summary: parsed.data.summary,
      recommended_for: parsed.data.recommendedFor,
      difficulty: parsed.data.difficulty,
      game_plan: parsed.data.gamePlan,
      mulligan_guide: parsed.data.mulliganGuide,
      card_choices: parsed.data.cardChoices || null,
      matchup_notes: parsed.data.matchupNotes || null,
    })
    .eq("id", id)
    .eq("author_id", user.id)
    .eq("status", "draft")
    .select("id,slug,status")
    .maybeSingle();
  if (error || !data) return response("수정할 초안을 찾지 못했습니다.", 404);

  return NextResponse.json(data);
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
