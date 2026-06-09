import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildOfficialEventImportSummary,
  persistOfficialEventImport,
} from "@/server/deck-tracking/official-event-service";

const RequestSchema = z.object({
  manifest: z.unknown(),
  write: z.boolean().default(false),
});

const MAX_BODY_BYTES = 800_000;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return response("매니페스트가 너무 큽니다.", 413);

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
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) return response("요청을 확인해주세요.", 400);

  try {
    if (!parsed.data.write) {
      const prepared = await buildOfficialEventImportSummary(parsed.data.manifest);
      return NextResponse.json({
        mode: "dry-run",
        summary: prepared.summary,
      });
    }

    const adminClient = createAdminSupabaseClient();
    if (!adminClient) return response("서비스 역할 Supabase 설정이 필요합니다.", 503);
    const imported = await persistOfficialEventImport({
      supabase: adminClient,
      input: parsed.data.manifest,
      inputLabel: `admin:${user.id}`,
    });

    return NextResponse.json({
      mode: "write",
      summary: imported.summary,
      result: imported.result,
    });
  } catch (error) {
    return response(
      error instanceof Error ? error.message : "공식 이벤트 매니페스트를 처리하지 못했습니다.",
      422,
    );
  }
}

function response(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}
