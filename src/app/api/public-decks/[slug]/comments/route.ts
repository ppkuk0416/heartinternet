import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CommentCreateSchema } from "@/server/community/schemas";
import { FixedWindowRateLimiter } from "@/server/rate-limit";

const limiter = new FixedWindowRateLimiter(8, 10 * 60 * 1_000);
const MAX_BODY_BYTES = 4_000;
const SLUG = /^[a-z0-9][a-z0-9-]{2,119}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return response("댓글이 너무 깁니다.", 413);

  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!limiter.consume(key).allowed) {
    return response("댓글 작성이 너무 빠릅니다. 잠시 후 다시 시도해주세요.", 429);
  }

  const { slug } = await params;
  if (!SLUG.test(slug)) return response("덱 주소를 확인해주세요.", 400);

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
  const parsed = CommentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return response("댓글은 2자 이상 2,000자 이하로 입력해주세요.", 400);
  }

  const { data: deck } = await client
    .from("decks")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!deck) return response("공개 덱을 찾을 수 없습니다.", 404);

  const { data, error } = await client
    .from("comments")
    .insert({
      deck_id: deck.id,
      author_id: user.id,
      body: parsed.data.body,
      status: "visible",
    })
    .select("id")
    .single();
  if (error) return response("댓글을 저장하지 못했습니다.", 500);

  return NextResponse.json({ id: data.id }, { status: 201 });
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
