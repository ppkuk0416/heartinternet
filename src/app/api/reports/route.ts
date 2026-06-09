import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ReportCreateSchema } from "@/server/community/schemas";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

const limiter = new FixedWindowRateLimiter(10, 60 * 60 * 1_000);
const MAX_BODY_BYTES = 4_000;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return response("신고 내용이 너무 깁니다.", 413);

  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.consume(key).allowed) {
    return response("신고 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);
  }

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
  const parsed = ReportCreateSchema.safeParse(body);
  if (!parsed.success) return response("신고 내용을 확인해주세요.", 400);

  const targetId = await resolveTargetId(client, parsed.data);
  if (!targetId) return response("신고 대상을 찾을 수 없습니다.", 404);

  const { error } = await client.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
    status: "open",
  });
  if (error) {
    const duplicate =
      error.code === "23505" || error.message.includes("duplicate");
    return response(
      duplicate ? "이미 처리 중인 신고가 있습니다." : "신고를 접수하지 못했습니다.",
      duplicate ? 409 : 500,
    );
  }

  return NextResponse.json({ reported: true }, { status: 201 });
}

async function resolveTargetId(
  client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  input: ReturnType<typeof ReportCreateSchema.parse>,
) {
  if (input.targetType === "deck") {
    const { data } = await client
      .from("decks")
      .select("id")
      .eq("slug", input.deckSlug)
      .eq("status", "published")
      .maybeSingle();
    return data?.id ?? null;
  }

  const { data } = await client
    .from("comments")
    .select("id")
    .eq("id", input.targetId)
    .eq("status", "visible")
    .maybeSingle();
  return data?.id ?? null;
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
