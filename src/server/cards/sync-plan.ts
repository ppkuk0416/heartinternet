import type {
  CardSyncPlan,
  ExistingCardIdentity,
  SyncedCardRecord,
} from "@/server/cards/types";

export function buildCardSyncPlan(
  incoming: SyncedCardRecord[],
  existing: ExistingCardIdentity[],
): CardSyncPlan {
  const existingByDbfId = new Map(
    existing.map((card) => [card.dbfId, card.cardId]),
  );
  const incomingDbfIds = new Set(incoming.map((card) => card.dbfId));
  let unchangedCount = 0;

  for (const card of incoming) {
    if (existingByDbfId.get(card.dbfId) === card.cardId) {
      unchangedCount += 1;
    }
  }

  return {
    // Upserting the full validated snapshot makes localization and legality
    // changes deterministic. Missing provider rows are deliberately not deleted.
    upserts: incoming,
    unchangedCount,
    missingExistingDbfIds: existing
      .filter((card) => !incomingDbfIds.has(card.dbfId))
      .map((card) => card.dbfId),
  };
}
