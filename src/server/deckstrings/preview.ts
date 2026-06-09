import { decodeDeckstring } from "@/server/deckstrings/adapter";
import type {
  CardCatalog,
  DecodedDeckstring,
  DeckPreview,
  PreviewCard,
} from "@/server/deckstrings/types";
import { validateDeckForPublication } from "@/server/deckstrings/validator";

export function createDeckPreview(
  input: string,
  catalog: CardCatalog,
): DeckPreview {
  const decoded = decodeDeckstring(input);
  return createDeckPreviewFromDecoded(decoded, catalog);
}

export function createDeckPreviewFromDecoded(
  decoded: DecodedDeckstring,
  catalog: CardCatalog,
): DeckPreview {
  const validation = validateDeckForPublication(decoded, catalog);
  const cards = decoded.cards
    .map<PreviewCard>((card) => {
      const reference = catalog.getByDbfId(card.dbfId);
      return {
        ...card,
        nameKo: reference?.nameKo ?? `알 수 없는 카드 #${card.dbfId}`,
        manaCost: reference?.manaCost ?? 0,
        legendary: reference?.legendary ?? false,
        known: reference?.type === "card",
      };
    })
    .sort(
      (left, right) =>
        left.manaCost - right.manaCost ||
        left.nameKo.localeCompare(right.nameKo, "ko"),
    );

  const grouped = new Map<number, PreviewCard[]>();
  for (const card of cards) {
    const group = grouped.get(card.manaCost) ?? [];
    group.push(card);
    grouped.set(card.manaCost, group);
  }

  return {
    decoded,
    validation,
    cards,
    groupedCards: [...grouped.entries()].map(([manaCost, groupedCards]) => ({
      manaCost,
      cards: groupedCards,
    })),
  };
}
