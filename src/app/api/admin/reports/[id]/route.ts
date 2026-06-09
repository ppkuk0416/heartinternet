import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReportDecisionSchema } from "@/server/community/moderation-schema";

const IdSchema = z.uuid();
const MAX_BODY_BYTES = 3_000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return response("검토 내용이 너무 깁니다.", 413);

  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return response("신고를 확인해주세요.", 400);

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
  const parsed = ReportDecisionSchema.safeParse(body);
  if (!parsed.success) return response("처리 결과와 사유를 확인해주세요.", 400);

  const { data, error } = await client.rpc("resolve_content_report", {
    target_report_id: id,
    decision: parsed.data.decision,
    decision_note: parsed.data.note,
  });
  if (error) return response("신고를 처리하지 못했습니다.", 409);

  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({
    status: result?.report_status,
    targetStatus: result?.target_status,
  });
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
