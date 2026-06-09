import { createDeckPreviewFromDecoded } from "@/server/deckstrings/preview";
import { decodeDeckstring } from "@/server/deckstrings/adapter";
import type { PlannedCandidate } from "@/server/deck-tracking/candidate-import";
import { getLiveCardCatalog } from "@/server/cards/live-catalog";

export async function validateCandidateCodes(items: PlannedCandidate[]) {
  const decodedItems = items
    .filter((item) => item.rawDeckCode)
    .map((item) => ({
      item,
      decoded: decodeDeckstring(item.rawDeckCode!),
    }));
  if (decodedItems.length === 0) return items;

  try {
    const resolved = await getLiveCardCatalog();
    const validatedAt = new Date().toISOString();
    const validationByHash = new Map(
      decodedItems.map(({ decoded }) => {
        const preview = createDeckPreviewFromDecoded(decoded, resolved.catalog);
        return [
          decoded.codeHash,
          {
            status: preview.validation.publishable ? "valid" : "invalid",
            classSlug: preview.validation.heroClassSlug,
            issues: preview.validation.issues,
            validatedAt,
            catalogSource: "hearthstonejson",
            catalogRevision: resolved.revision,
          },
        ] as const;
      }),
    );

    return items.map((item) => {
      if (!item.codeHash) return item;
      const validation = validationByHash.get(item.codeHash);
      if (!validation) return item;
      return {
        ...item,
        classSlug: validation.classSlug ?? item.classSlug,
        codeValidationStatus: validation.status,
        codeValidationIssues: validation.issues,
        codeValidatedAt: validation.validatedAt,
        metadata: {
          ...item.metadata,
          catalogSource: validation.catalogSource,
          catalogRevision: validation.catalogRevision,
        },
      } satisfies PlannedCandidate;
    });
  } catch (error) {
    const validatedAt = new Date().toISOString();
    return items.map((item) =>
      item.rawDeckCode
        ? {
            ...item,
            codeValidationStatus: "unavailable" as const,
            codeValidationIssues: [
              {
                code: "catalog_unavailable",
                severity: "error" as const,
                message:
                  error instanceof Error
                    ? error.message
                    : "카드 카탈로그를 불러오지 못했습니다.",
              },
            ],
            codeValidatedAt: validatedAt,
          }
        : item,
    );
  }
}
