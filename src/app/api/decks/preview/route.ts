import { NextResponse } from "next/server";
import { z } from "zod";
import { decodeDeckstring } from "@/server/deckstrings/adapter";
import { DeckstringError } from "@/server/deckstrings/errors";
import { createDeckPreviewFromDecoded } from "@/server/deckstrings/preview";
import { FixedWindowRateLimiter } from "@/server/rate-limit";
import { resolveCardCatalog } from "@/server/repositories/card-catalog";

const MAX_BODY_BYTES = 8_192;
const limiter = new FixedWindowRateLimiter(20, 10 * 60 * 1_000);
const RequestSchema = z.object({
  input: z.string().trim().min(20).max(6_000),
});

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return errorResponse("입력 크기가 너무 큽니다.", 413);
  }

  const rate = limiter.consume(clientKey(request));
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1_000)),
          ),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("JSON 요청 형식이 올바르지 않습니다.", 400);
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("20자 이상의 덱 코드를 입력해주세요.", 400);
  }

  try {
    const decoded = decodeDeckstring(parsed.data.input);
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

    return NextResponse.json({
      canonicalCode: decoded.canonicalCode,
      codeHash: decoded.codeHash,
      format: decoded.format,
      heroClassSlug: preview.validation.heroClassSlug,
      mainDeckCardCount: preview.validation.mainDeckCardCount,
      sideboardCardCount: decoded.sideboardCards.reduce(
        (total, card) => total + card.quantity,
        0,
      ),
      publishable: preview.validation.publishable,
      issues: preview.validation.issues,
      groupedCards: preview.groupedCards,
      catalog: {
        source: resolved.source,
        revision: resolved.revision,
        warnings: resolved.warnings.slice(0, 5),
      },
    });
  } catch (error) {
    if (error instanceof DeckstringError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }

    return errorResponse(
      "카드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
      503,
    );
  }
}

function clientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
