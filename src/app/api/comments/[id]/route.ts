import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const IdSchema = z.uuid();

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return response("댓글을 확인해주세요.", 400);

  const client = await createServerSupabaseClient();
  if (!client) return response("Supabase 연결이 필요합니다.", 503);
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return response("로그인이 필요합니다.", 401);

  const { data, error } = await client
    .from("comments")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", user.id)
    .eq("status", "visible")
    .select("id")
    .maybeSingle();
  if (error || !data) return response("삭제할 댓글을 찾지 못했습니다.", 404);

  return NextResponse.json({ deleted: true });
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
