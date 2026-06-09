import "server-only";

import {
  type DeckCatalogQuery,
  queryDemoDecks,
} from "@/lib/deck-catalog";
import {
  CURRENT_PATCH,
  decks,
  getBeginnerDecks,
  getFeaturedDecks,
  getPopularDecks,
} from "@/lib/decks";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Deck, DeckClass, Difficulty, EvidenceStatus } from "@/lib/types";

type PublicDeckRow = {
  total_count: number;
  slug: string;
  title: string;
  summary: string;
  recommended_for: string;
  difficulty: "easy" | "medium" | "hard";
  class_name: string;
  archetype_name: string;
  strategy: string;
  author_name: string;
  patch_version: string;
  is_current_patch: boolean;
  raw_code: string;
  evidence_status: string;
  source_type: string;
  source_url: string | null;
  source_name: string | null;
  claimed_rank: string | null;
  wins: number | null;
  losses: number | null;
  evidence_note: string | null;
  tags: string[];
  recommendation_count: number;
  comment_count: number;
  copy_count: number;
  trend_score: number;
  tracking_source_count: number;
  last_tracked_at: string | null;
  updated_at: string;
};

export type DeckCatalogResult = {
  decks: Deck[];
  total: number;
  page: number;
  pageSize: number;
  source: "database" | "demo";
  unavailable: boolean;
  currentPatch: string;
};

export type HomeDeckCatalog = {
  featured: Deck[];
  popular: Deck[];
  beginner: Deck[];
  latestTrusted: Deck[];
  source: "database" | "demo";
  unavailable: boolean;
  currentPatch: string;
};

export async function getPublicDecks(
  query: DeckCatalogQuery,
): Promise<DeckCatalogResult> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(query.pageSize ?? 18, 24));
  const client = await createServerSupabaseClient();

  if (!client) {
    return {
      ...queryDemoDecks(decks, { ...query, page, pageSize }),
      source: "demo",
      unavailable: false,
      currentPatch: CURRENT_PATCH,
    };
  }

  const [firstAttempt, currentPatch] = await Promise.all([
    runCatalogQuery(client, query, {
      page,
      pageSize,
    }),
    getCurrentPatch(client),
  ]);

  if (firstAttempt.error) {
    console.error("Public deck catalog query failed:", firstAttempt.error);
    return {
      decks: [],
      total: 0,
      page,
      pageSize,
      source: "database",
      unavailable: true,
      currentPatch,
    };
  }

  let rows = firstAttempt.rows;
  let resolvedPage = page;

  if (rows.length === 0 && page > 1) {
    const firstPageAttempt = await runCatalogQuery(client, query, {
      page: 1,
      pageSize,
    });
    if (firstPageAttempt.error) {
      console.error("Public deck catalog recovery failed:", firstPageAttempt.error);
      return {
        decks: [],
        total: 0,
        page,
        pageSize,
        source: "database",
        unavailable: true,
        currentPatch,
      };
    }
    rows = firstPageAttempt.rows;
    resolvedPage = 1;
  }

  return {
    decks: rows.map(mapPublicDeck),
    total: rows[0]?.total_count ?? 0,
    page: resolvedPage,
    pageSize,
    source: "database",
    unavailable: false,
    currentPatch,
  };
}

export async function getHomeDeckCatalog(): Promise<HomeDeckCatalog> {
  const client = await createServerSupabaseClient();
  if (!client) {
    return {
      featured: getFeaturedDecks(),
      popular: getPopularDecks(),
      beginner: getBeginnerDecks(),
      latestTrusted: decks
        .filter((deck) => deck.evidence !== "작성자 입력")
        .sort(
          (left, right) =>
            (right.trendScore ?? 0) - (left.trendScore ?? 0) ||
            (right.lastTrackedAt ?? right.updatedAt).localeCompare(
              left.lastTrackedAt ?? left.updatedAt,
            ),
        )
        .slice(0, 3),
      source: "demo",
      unavailable: false,
      currentPatch: CURRENT_PATCH,
    };
  }

  const [featured, popular, beginner, latestTrusted, currentPatch] = await Promise.all([
    runHomeQuery(client, { sort: "recommended", limit: 3 }),
    runHomeQuery(client, { sort: "copies", limit: 4 }),
    runHomeQuery(client, {
      sort: "recommended",
      tag: "초보 추천",
      limit: 3,
    }),
    runHomeQuery(client, {
      sort: "trending",
      evidence: "trusted",
      limit: 3,
    }),
    getCurrentPatch(client),
  ]);

  if (!featured || !popular || !beginner || !latestTrusted) {
    return {
      featured: [],
      popular: [],
      beginner: [],
      latestTrusted: [],
      source: "database",
      unavailable: true,
      currentPatch,
    };
  }

  return {
    featured: featured.map((deck) => ({
      ...deck,
      featuredReason: "커뮤니티 추천 상위",
    })),
    popular,
    beginner,
    latestTrusted,
    source: "database",
    unavailable: false,
    currentPatch,
  };
}

async function runHomeQuery(
  client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  {
    sort,
    tag,
    evidence,
    limit,
  }: {
    sort: "recommended" | "copies" | "latest" | "trending";
    tag?: string;
    evidence?: "trusted";
    limit: number;
  },
) {
  const { data, error } = await client.rpc("search_public_decks", {
    p_query: null,
    p_class: null,
    p_tag: tag ?? null,
    p_evidence: evidence ?? null,
    p_source: null,
    p_current_patch_only: true,
    p_sort: sort,
    p_limit: limit,
    p_offset: 0,
  });

  if (error) {
    console.error("Home deck catalog query failed:", error.message);
    return null;
  }

  return ((data ?? []) as PublicDeckRow[]).map(mapPublicDeck);
}

async function runCatalogQuery(
  client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
  query: DeckCatalogQuery,
  { page, pageSize }: { page: number; pageSize: number },
) {
  const { data, error } = await client.rpc("search_public_decks", {
    p_query: query.query?.slice(0, 80) || null,
    p_class: query.className || null,
    p_tag: query.tag || null,
    p_evidence: query.trustedOnly ? "trusted" : evidenceValue(query.evidence),
    p_source: query.source || null,
    p_current_patch_only: !query.includeOld,
    p_sort: query.sort ?? "recommended",
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });

  return {
    rows: (data ?? []) as PublicDeckRow[],
    error: error?.message ?? null,
  };
}

function mapPublicDeck(row: PublicDeckRow): Deck {
  const evidence = evidenceLabel(row.evidence_status);
  return {
    slug: row.slug,
    title: row.title,
    className: row.class_name as DeckClass,
    archetype: row.archetype_name,
    strategy: strategyLabel(row.strategy),
    author: row.author_name,
    authorRole: "커뮤니티 기여자",
    patch: row.patch_version,
    patchStatus: row.is_current_patch ? "현재 패치" : "이전 패치",
    evidence,
    sourceType: sourceTypeLabel(row.source_type),
    sourceLabel:
      row.source_name ||
      row.evidence_note ||
      (evidence === "작성자 입력"
        ? "작성자가 직접 입력한 플레이 정보입니다."
        : "연결된 원본 출처를 확인할 수 있습니다."),
    sourceUrl: row.source_url ?? undefined,
    rank: row.claimed_rank ?? undefined,
    record:
      row.wins !== null && row.losses !== null
        ? `${row.wins}승 ${row.losses}패`
        : undefined,
    difficulty: difficultyLabel(row.difficulty),
    tags: row.tags ?? [],
    summary: row.summary,
    recommendedFor: row.recommended_for,
    strengths: [],
    weaknesses: [],
    gamePlan: [],
    mulligan: { core: [], situational: [] },
    cardChoices: [],
    matchupNotes: [],
    cards: [],
    deckCode: row.raw_code,
    recommendations: row.recommendation_count,
    comments: row.comment_count,
    copies: row.copy_count,
    trendScore: row.trend_score,
    trackingSourceCount: row.tracking_source_count,
    lastTrackedAt: row.last_tracked_at
      ? new Intl.DateTimeFormat("ko-KR").format(new Date(row.last_tracked_at))
      : undefined,
    updatedAt: new Intl.DateTimeFormat("ko-KR").format(new Date(row.updated_at)),
  };
}

function evidenceValue(value: EvidenceStatus | undefined) {
  return value
    ? {
        "운영진 확인": "reviewed",
        "출처 연결": "source_linked",
        "작성자 입력": "self_reported",
      }[value]
    : null;
}

function evidenceLabel(value: string): EvidenceStatus {
  return value === "reviewed"
    ? "운영진 확인"
    : value === "source_linked"
      ? "출처 연결"
      : "작성자 입력";
}

function difficultyLabel(value: PublicDeckRow["difficulty"]): Difficulty {
  return { easy: "쉬움", medium: "보통", hard: "어려움" }[value] as Difficulty;
}

function strategyLabel(value: string) {
  return (
    {
      aggro: "어그로",
      tempo: "템포",
      midrange: "미드레인지",
      control: "컨트롤",
      combo: "콤보",
      other: "기타",
    }[value] ?? "기타"
  );
}

function sourceTypeLabel(value: string) {
  return (
    {
      community: "커뮤니티 덱",
      ranked: "등급전·랭커 덱",
      creator: "콘텐츠 제작자 덱",
      tournament: "대회 덱",
      external_stats: "외부 통계 덱",
    }[value] ?? "커뮤니티 덱"
  );
}

async function getCurrentPatch(
  client: NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>,
) {
  const { data, error } = await client
    .from("patches")
    .select("version")
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    console.error("Current patch query failed:", error.message);
    return "미확인";
  }

  return data?.version ?? "미확인";
}
