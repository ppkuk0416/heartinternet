import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export const REVIEW_QUEUE_STATUSES = [
  "ready_for_review",
  "needs_validation",
  "needs_code",
  "reviewing",
  "discovered",
  "approved",
] as const;

export type ReviewQueueStatus = (typeof REVIEW_QUEUE_STATUSES)[number];

export type DeckCandidateQueueItem = {
  id: string;
  status: ReviewQueueStatus;
  priorityScore: number;
  title: string | null;
  playerName: string | null;
  eventName: string | null;
  claimedRank: string | null;
  sourceUrl: string;
  sourcePublishedAt: string | null;
  rawDeckCode: string | null;
  codeHash: string | null;
  codeValidationStatus: string;
  codeValidationIssues: Array<{
    code: string;
    severity: "error" | "warning";
    message: string;
  }>;
  format: string;
  wins: number | null;
  losses: number | null;
  observedCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  source: {
    name: string;
    type: string;
    trustTier: number;
  };
  className: string | null;
  patchVersion: string | null;
  currentPatch: boolean;
};

export type DeckLinkTarget = {
  id: string;
  slug: string;
  title: string;
  className: string;
  codeHash: string | null;
};

type CandidateRow = {
  id: string;
  status: ReviewQueueStatus;
  priority_score: number;
  title: string | null;
  player_name: string | null;
  event_name: string | null;
  claimed_rank: string | null;
  source_url: string;
  source_published_at: string | null;
  raw_deck_code: string | null;
  code_hash: string | null;
  code_validation_status: string;
  code_validation_issues: Array<{
    code: string;
    severity: "error" | "warning";
    message: string;
  }>;
  format: string;
  wins: number | null;
  losses: number | null;
  observed_count: number;
  first_seen_at: string;
  last_seen_at: string;
  deck_tracking_sources: {
    name: string;
    source_type: string;
    trust_tier: number;
  } | null;
  hearthstone_classes: { name_ko: string } | null;
  patches: { version: string; is_current: boolean } | null;
};

type DeckTargetRow = {
  id: string;
  slug: string;
  title: string;
  hearthstone_classes: { name_ko: string } | null;
  active_code: { code_hash: string } | null;
};

export type DeckCandidateQueue = {
  items: DeckCandidateQueueItem[];
  linkTargets: DeckLinkTarget[];
  total: number;
  page: number;
  pageSize: number;
  unavailable: boolean;
};

export async function getDeckCandidateQueue({
  status,
  page,
}: {
  status: ReviewQueueStatus;
  page: number;
}): Promise<DeckCandidateQueue> {
  const pageSize = 20;
  const safePage = Math.max(1, page);
  const client = await createServerSupabaseClient();

  if (!client) {
    return {
      items: [],
      linkTargets: [],
      total: 0,
      page: safePage,
      pageSize,
      unavailable: true,
    };
  }

  const from = (safePage - 1) * pageSize;
  const [candidateResult, targetResult] = await Promise.all([
    client
      .from("deck_candidates")
      .select(
        `
        id,status,priority_score,title,player_name,event_name,claimed_rank,
        source_url,source_published_at,raw_deck_code,code_hash,
        code_validation_status,code_validation_issues,format,
        wins,losses,observed_count,first_seen_at,last_seen_at,
        deck_tracking_sources(name,source_type,trust_tier),
        hearthstone_classes(name_ko),
        patches(version,is_current)
        `,
        { count: "exact" },
      )
      .eq("status", status)
      .order("priority_score", { ascending: false })
      .order("last_seen_at", { ascending: false })
      .range(from, from + pageSize - 1),
    client
      .from("decks")
      .select(
        `
        id,slug,title,
        hearthstone_classes(name_ko),
        active_code:deck_codes!decks_current_deck_code_fk(code_hash)
        `,
      )
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  if (candidateResult.error || targetResult.error) {
    console.error(
      "Deck candidate queue query failed:",
      candidateResult.error?.message ?? targetResult.error?.message,
    );
    return {
      items: [],
      linkTargets: [],
      total: 0,
      page: safePage,
      pageSize,
      unavailable: true,
    };
  }

  return {
    items: ((candidateResult.data ?? []) as unknown as CandidateRow[]).map(
      mapCandidate,
    ),
    linkTargets: ((targetResult.data ?? []) as unknown as DeckTargetRow[]).map(
      (row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        className: row.hearthstone_classes?.name_ko ?? "직업 미확인",
        codeHash: row.active_code?.code_hash ?? null,
      }),
    ),
    total: candidateResult.count ?? 0,
    page: safePage,
    pageSize,
    unavailable: false,
  };
}

function mapCandidate(row: CandidateRow): DeckCandidateQueueItem {
  return {
    id: row.id,
    status: row.status,
    priorityScore: row.priority_score,
    title: row.title,
    playerName: row.player_name,
    eventName: row.event_name,
    claimedRank: row.claimed_rank,
    sourceUrl: row.source_url,
    sourcePublishedAt: row.source_published_at,
    rawDeckCode: row.raw_deck_code,
    codeHash: row.code_hash,
    codeValidationStatus: row.code_validation_status,
    codeValidationIssues: row.code_validation_issues ?? [],
    format: row.format,
    wins: row.wins,
    losses: row.losses,
    observedCount: row.observed_count,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    source: {
      name: row.deck_tracking_sources?.name ?? "알 수 없는 출처",
      type: row.deck_tracking_sources?.source_type ?? "community",
      trustTier: row.deck_tracking_sources?.trust_tier ?? 1,
    },
    className: row.hearthstone_classes?.name_ko ?? null,
    patchVersion: row.patches?.version ?? null,
    currentPatch: row.patches?.is_current ?? false,
  };
}
