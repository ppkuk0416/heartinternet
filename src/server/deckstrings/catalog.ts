import type {
  CardCatalog,
  CardReference,
} from "@/server/deckstrings/types";

export class InMemoryCardCatalog implements CardCatalog {
  private readonly cards: Map<number, CardReference>;

  constructor(cards: CardReference[]) {
    this.cards = new Map(cards.map((card) => [card.dbfId, card]));
  }

  getByDbfId(dbfId: number) {
    return this.cards.get(dbfId);
  }
}
