import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

const IdSchema = z.uuid();
const RequestSchema = z.object({ active: z.boolean() });
const limiter = new FixedWindowRateLimiter(40, 10 * 60 * 1_000);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.consume(key).allowed) {
    return response("잠시 후 다시 시도해주세요.", 429);
  }

  const { id } = await params;
  if (!IdSchema.safeParse(id).success) {
    return response("댓글을 확인해주세요.", 400);
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return response("JSON 요청 형식이 올바르지 않습니다.", 400);
  }
  const parsed = RequestSchema.safeParse(input);
  if (!parsed.success) return response("요청을 확인해주세요.", 400);

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return response("로그인이 필요합니다.", 401);

  const { data: comment } = await client
    .from("comments")
    .select("id,author_id,status")
    .eq("id", id)
    .maybeSingle();
  if (!comment || comment.status !== "visible") {
    return response("공개 댓글을 찾을 수 없습니다.", 404);
  }
  if (comment.author_id === user.id) {
    return response("내 댓글에는 도움됨을 표시할 수 없습니다.", 400);
  }

  const mutation = parsed.data.active
    ? await client.from("comment_likes").upsert(
        { comment_id: id, user_id: user.id },
        { onConflict: "user_id,comment_id", ignoreDuplicates: true },
      )
    : await client
        .from("comment_likes")
        .delete()
        .eq("comment_id", id)
        .eq("user_id", user.id);
  if (mutation.error) return response("도움됨을 저장하지 못했습니다.", 500);

  const { data: updated, error: countError } = await client
    .from("comments")
    .select("helpful_count")
    .eq("id", id)
    .single();
  if (countError) return response("도움됨 수를 확인하지 못했습니다.", 500);

  return NextResponse.json({
    active: parsed.data.active,
    count: Number(updated.helpful_count),
  });
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
