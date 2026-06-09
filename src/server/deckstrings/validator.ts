import type {
  CardCatalog,
  DecodedCard,
  DecodedDeckstring,
  DeckValidationResult,
  ValidationIssue,
} from "@/server/deckstrings/types";

export function validateDeckForPublication(
  deck: DecodedDeckstring,
  catalog: CardCatalog,
): DeckValidationResult {
  const issues: ValidationIssue[] = [];
  const supported = deck.format === "standard";

  if (!supported) {
    issues.push({
      code: "unsupported_format",
      severity: "error",
      message: `MVP에서는 정규전 덱만 게시할 수 있습니다. 입력 포맷: ${deck.format}`,
    });
  }

  if (deck.heroDbfIds.length !== 1) {
    issues.push({
      code: "invalid_hero_count",
      severity: "error",
      message: `영웅은 정확히 한 명이어야 합니다. 현재 ${deck.heroDbfIds.length}명입니다.`,
    });
  }

  const hero =
    deck.heroDbfIds.length === 1
      ? catalog.getByDbfId(deck.heroDbfIds[0])
      : undefined;
  const heroClassSlug =
    hero?.type === "hero" && hero.classSlugs.length === 1
      ? hero.classSlugs[0]
      : undefined;

  if (
    deck.heroDbfIds.length === 1 &&
    (!hero || hero.type !== "hero" || !heroClassSlug)
  ) {
    issues.push({
      code: "unknown_hero",
      severity: "error",
      dbfId: deck.heroDbfIds[0],
      message: `영웅 DBF ID ${deck.heroDbfIds[0]}를 카드 데이터에서 확인할 수 없습니다.`,
    });
  }

  const mainDeckCardCount = deck.cards.reduce(
    (total, card) => total + card.quantity,
    0,
  );
  if (mainDeckCardCount !== 30) {
    issues.push({
      code: "invalid_card_count",
      severity: "error",
      message: `정규전 덱은 30장이어야 합니다. 현재 ${mainDeckCardCount}장입니다.`,
    });
  }

  validateDuplicateEntries(deck.cards, issues);
  for (const card of deck.cards) {
    validateCard(card, catalog, heroClassSlug, issues);
  }

  const mainCardIds = new Set(deck.cards.map((card) => card.dbfId));
  const sideboardKeys = new Set<string>();
  for (const sideboardCard of deck.sideboardCards) {
    const key = `${sideboardCard.ownerDbfId}:${sideboardCard.dbfId}`;
    if (sideboardKeys.has(key)) {
      issues.push({
        code: "duplicate_sideboard_entry",
        severity: "error",
        dbfId: sideboardCard.dbfId,
        message: `사이드보드 카드 DBF ID ${sideboardCard.dbfId}가 같은 소유자에 중복되어 있습니다.`,
      });
    }
    sideboardKeys.add(key);

    const owner = catalog.getByDbfId(sideboardCard.ownerDbfId);
    if (!owner) {
      issues.push({
        code: "unknown_sideboard_owner",
        severity: "error",
        dbfId: sideboardCard.ownerDbfId,
        message: `사이드보드 소유자 DBF ID ${sideboardCard.ownerDbfId}를 찾을 수 없습니다.`,
      });
    }
    if (!mainCardIds.has(sideboardCard.ownerDbfId)) {
      issues.push({
        code: "sideboard_owner_not_in_deck",
        severity: "error",
        dbfId: sideboardCard.ownerDbfId,
        message: `사이드보드 소유자 DBF ID ${sideboardCard.ownerDbfId}가 본 덱에 없습니다.`,
      });
    }
    validateCard(sideboardCard, catalog, heroClassSlug, issues);
  }

  return {
    decodable: true,
    supported,
    publishable: supported && !issues.some((issue) => issue.severity === "error"),
    heroClassSlug,
    mainDeckCardCount,
    issues,
  };
}

function validateDuplicateEntries(
  cards: DecodedCard[],
  issues: ValidationIssue[],
) {
  const seen = new Set<number>();
  for (const card of cards) {
    if (seen.has(card.dbfId)) {
      issues.push({
        code: "duplicate_card_entry",
        severity: "error",
        dbfId: card.dbfId,
        message: `카드 DBF ID ${card.dbfId}가 덱 코드에 중복 항목으로 들어 있습니다.`,
      });
    }
    seen.add(card.dbfId);
  }
}

function validateCard(
  card: DecodedCard,
  catalog: CardCatalog,
  heroClassSlug: string | undefined,
  issues: ValidationIssue[],
) {
  const reference = catalog.getByDbfId(card.dbfId);

  if (!Number.isInteger(card.quantity) || card.quantity < 1 || card.quantity > 2) {
    issues.push({
      code: "invalid_quantity",
      severity: "error",
      dbfId: card.dbfId,
      message: `카드 DBF ID ${card.dbfId}의 수량 ${card.quantity}장은 구성 제한을 벗어납니다.`,
    });
  }

  if (!reference || reference.type !== "card") {
    issues.push({
      code: "unknown_card",
      severity: "error",
      dbfId: card.dbfId,
      message: `카드 DBF ID ${card.dbfId}를 카드 데이터에서 확인할 수 없습니다.`,
    });
    return;
  }

  if (reference.legendary && card.quantity > 1) {
    issues.push({
      code: "legendary_quantity",
      severity: "error",
      dbfId: card.dbfId,
      message: `전설 카드 ${reference.nameKo}는 한 장만 넣을 수 있습니다.`,
    });
  }

  if (!reference.collectible) {
    issues.push({
      code: "non_collectible_card",
      severity: "error",
      dbfId: card.dbfId,
      message: `${reference.nameKo}은(는) 수집 가능한 카드가 아닙니다.`,
    });
  }

  if (!reference.standardLegal) {
    issues.push({
      code: "card_not_standard",
      severity: "error",
      dbfId: card.dbfId,
      message: `${reference.nameKo}은(는) 현재 정규전 카드가 아닙니다.`,
    });
  }

  if (
    heroClassSlug &&
    reference.classSlugs.length > 0 &&
    !reference.classSlugs.includes(heroClassSlug)
  ) {
    issues.push({
      code: "class_mismatch",
      severity: "error",
      dbfId: card.dbfId,
      message: `${reference.nameKo}은(는) ${heroClassSlug} 덱에 넣을 수 없습니다.`,
    });
  }
}
