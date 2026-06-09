export type StandardLegalityConfig = {
  verifiedAt: string;
  standardSetSlugs: string[];
  standardLegalCardIds: string[];
  pendingSetSlugs: string[];
  sources: string[];
  note: string;
};

export type SyncedCardRecord = {
  dbfId: number;
  cardId: string;
  nameKo: string;
  nameEn: string;
  classSlug: string | null;
  classSlugs: string[];
  cardType: string;
  manaCost: number;
  rarity: string | null;
  setSlug: string;
  craftingCost: number | null;
  imageUrlKo: string | null;
  isCollectible: boolean;
  isStandardLegal: boolean;
  isLegendary: boolean;
  isActive: boolean;
};

export type CardProviderResult = {
  provider: "hearthstonejson";
  revision: string;
  fetchedAt: string;
  cards: SyncedCardRecord[];
  warnings: string[];
};

export type ExistingCardIdentity = {
  dbfId: number;
  cardId: string;
};

export type CardSyncPlan = {
  upserts: SyncedCardRecord[];
  unchangedCount: number;
  missingExistingDbfIds: number[];
};
