import type { Deck, EvidenceStatus } from "@/lib/types";

export type DeckCatalogSort =
  | "recommended"
  | "copies"
  | "latest"
  | "popular"
  | "trending";

export type DeckCatalogQuery = {
  query?: string;
  className?: string;
  tag?: string;
  evidence?: EvidenceStatus;
  trustedOnly?: boolean;
  source?: string;
  includeOld?: boolean;
  sort?: DeckCatalogSort;
  page?: number;
  pageSize?: number;
};

export function queryDemoDecks(items: Deck[], query: DeckCatalogQuery) {
  const search = query.query?.trim().toLocaleLowerCase("ko") ?? "";
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(query.pageSize ?? 18, 24));
  const sort = query.sort ?? "recommended";

  const filtered = items
    .filter((deck) => {
      const searchable =
        `${deck.title} ${deck.summary} ${deck.className} ${deck.archetype} ${deck.strategy}`.toLocaleLowerCase(
          "ko",
        );

      return (
        (!search || searchable.includes(search)) &&
        (!query.className || deck.className === query.className) &&
        (!query.tag || deck.tags.includes(query.tag)) &&
        (!query.evidence || deck.evidence === query.evidence) &&
        (!query.trustedOnly || deck.evidence !== "작성자 입력") &&
        (!query.source || sourceValue(deck.sourceType) === query.source) &&
        (query.includeOld || deck.patchStatus === "현재 패치")
      );
    })
    .sort((left, right) => {
      if (sort === "latest") return right.updatedAt.localeCompare(left.updatedAt);
      if (sort === "copies") return right.copies - left.copies;
      if (sort === "trending") {
        return (
          (right.trendScore ?? 0) - (left.trendScore ?? 0) ||
          (right.lastTrackedAt ?? right.updatedAt).localeCompare(
            left.lastTrackedAt ?? left.updatedAt,
          )
        );
      }
      if (sort === "popular") {
        return (
          right.recommendations +
          right.comments -
          (left.recommendations + left.comments)
        );
      }
      return right.recommendations - left.recommendations;
    });

  const offset = (page - 1) * pageSize;
  const resolvedPage =
    filtered.length > 0 && offset >= filtered.length ? 1 : page;
  const resolvedOffset = (resolvedPage - 1) * pageSize;
  return {
    decks: filtered.slice(resolvedOffset, resolvedOffset + pageSize),
    total: filtered.length,
    page: resolvedPage,
    pageSize,
  };
}

function sourceValue(value: string) {
  return (
    {
      "커뮤니티 덱": "community",
      "랭크 덱": "ranked",
      "등급전·랭커 덱": "ranked",
      "콘텐츠 제작자 덱": "creator",
      "대회 덱": "tournament",
      "외부 통계 덱": "external_stats",
    }[value] ?? "community"
  );
}
