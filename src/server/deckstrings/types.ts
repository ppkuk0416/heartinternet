export const DECKSTRING_FORMAT = {
  wild: 1,
  standard: 2,
  classic: 3,
  twist: 4,
} as const;

export type DeckstringFormat = keyof typeof DECKSTRING_FORMAT;

export type DecodedCard = {
  dbfId: number;
  quantity: number;
};

export type DecodedSideboardCard = DecodedCard & {
  ownerDbfId: number;
};

export type DecodedDeckstring = {
  inputCode: string;
  canonicalCode: string;
  codeHash: string;
  format: DeckstringFormat;
  heroDbfIds: number[];
  cards: DecodedCard[];
  sideboardCards: DecodedSideboardCard[];
};

export type CardReference = {
  dbfId: number;
  cardId: string;
  nameKo: string;
  nameEn: string;
  type: "hero" | "card";
  classSlugs: string[];
  manaCost: number;
  collectible: boolean;
  standardLegal: boolean;
  legendary: boolean;
};

export interface CardCatalog {
  getByDbfId(dbfId: number): CardReference | undefined;
}

export type ValidationIssueCode =
  | "unsupported_format"
  | "invalid_hero_count"
  | "unknown_hero"
  | "invalid_card_count"
  | "duplicate_card_entry"
  | "unknown_card"
  | "non_collectible_card"
  | "card_not_standard"
  | "class_mismatch"
  | "invalid_quantity"
  | "legendary_quantity"
  | "duplicate_sideboard_entry"
  | "unknown_sideboard_owner"
  | "sideboard_owner_not_in_deck";

export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: "error" | "warning";
  message: string;
  dbfId?: number;
};

export type DeckValidationResult = {
  decodable: true;
  supported: boolean;
  publishable: boolean;
  heroClassSlug?: string;
  mainDeckCardCount: number;
  issues: ValidationIssue[];
};

export type PreviewCard = DecodedCard & {
  nameKo: string;
  manaCost: number;
  legendary: boolean;
  known: boolean;
};

export type DeckPreview = {
  decoded: DecodedDeckstring;
  validation: DeckValidationResult;
  cards: PreviewCard[];
  groupedCards: Array<{
    manaCost: number;
    cards: PreviewCard[];
  }>;
};
