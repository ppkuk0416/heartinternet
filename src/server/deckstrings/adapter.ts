import { createHash } from "node:crypto";
import {
  decode,
  encode,
  type DeckDefinition,
  type FormatType,
} from "deckstrings";
import { DeckstringError } from "@/server/deckstrings/errors";
import {
  DECKSTRING_FORMAT,
  type DecodedDeckstring,
  type DeckstringFormat,
} from "@/server/deckstrings/types";

export const DECKSTRING_PARSER_VERSION = "deckstrings-3.1.2+hde-1";

const BASE64_LINE = /^[A-Za-z0-9+/]+={0,2}$/;
const MIN_DECKSTRING_LENGTH = 20;

export function decodeDeckstring(input: string): DecodedDeckstring {
  if (!input.trim()) {
    throw new DeckstringError("empty_input", "덱 코드를 입력해주세요.");
  }

  const candidates = extractCandidates(input);
  if (candidates.length === 0) {
    throw new DeckstringError(
      "code_not_found",
      "입력에서 하스스톤 덱 코드를 찾지 못했습니다.",
    );
  }

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const deck = decode(candidate);
      const canonicalCode = encode(deck);

      return {
        inputCode: candidate,
        canonicalCode,
        codeHash: hashDeckCode(canonicalCode),
        format: formatName(deck.format),
        heroDbfIds: [...deck.heroes],
        cards: deck.cards.map(([dbfId, quantity]) => ({ dbfId, quantity })),
        sideboardCards: deck.sideboardCards.map(
          ([dbfId, quantity, ownerDbfId]) => ({
            dbfId,
            quantity,
            ownerDbfId,
          }),
        ),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new DeckstringError(
    "invalid_code",
    lastError instanceof Error
      ? `덱 코드를 해독할 수 없습니다: ${lastError.message}`
      : "덱 코드를 해독할 수 없습니다.",
  );
}

export function canonicalizeDeckDefinition(deck: DeckDefinition) {
  return encode(deck);
}

export function hashDeckCode(canonicalCode: string) {
  return createHash("sha256").update(canonicalCode, "utf8").digest("hex");
}

function extractCandidates(input: string) {
  const candidates = new Set<string>();

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (isDeckstringCandidate(line)) {
      candidates.add(line);
    }
  }

  const compact = input.replace(/\s+/g, "");
  if (isDeckstringCandidate(compact)) {
    candidates.add(compact);
  }

  return [...candidates].sort((left, right) => right.length - left.length);
}

function isDeckstringCandidate(value: string) {
  return (
    value.length >= MIN_DECKSTRING_LENGTH &&
    value.length % 4 === 0 &&
    BASE64_LINE.test(value)
  );
}

function formatName(format: FormatType): DeckstringFormat {
  const entry = Object.entries(DECKSTRING_FORMAT).find(
    ([, value]) => value === format,
  );

  if (!entry) {
    throw new DeckstringError(
      "invalid_code",
      `지원되지 않는 덱 코드 포맷 번호입니다: ${format}`,
    );
  }

  return entry[0] as DeckstringFormat;
}
