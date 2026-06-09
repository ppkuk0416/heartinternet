import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Deck, DeckClass, Difficulty, EvidenceStatus } from "@/lib/types";

export type PublishedDeckRow = {
  slug: string;
  title: string;
  summary: string;
  recommended_for: string;
  difficulty: "easy" | "medium" | "hard";
  strengths: string[];
  weaknesses: string[];
  game_plan: string;
  mulligan_guide: string;
  card_choices: string | null;
  matchup_notes: string | null;
  recommendation_count: number;
  favorite_count: number;
  comment_count: number;
  copy_count: number;
  updated_at: string;
  hearthstone_classes: { name_ko: string } | null;
  archetypes: { name_ko: string; strategy_type: string } | null;
  profiles: { display_name: string } | null;
  deck_tags: Array<{ tags: { name_ko: string } | null }>;
  active_code:
    | {
        raw_code: string;
        patches: { version: string; is_current: boolean } | null;
        deck_cards: Array<{
          quantity: number;
          sideboard_for_card_id: string | null;
          cards: {
            name_ko: string;
            mana_cost: number;
            is_legendary: boolean;
          } | null;
        }>;
      }
    | null;
  source_evidence: Array<{
    source_type: string;
    source_url: string | null;
    source_name: string | null;
    claimed_rank: string | null;
    wins: number | null;
    losses: number | null;
    evidence_status: string;
    evidence_note: string | null;
  }>;
};

export async function getPublishedDeck(slug: string): Promise<Deck | null> {
  const client = await createServerSupabaseClient();
  if (!client) return null;

  const { data, error } = await client
    .from("decks")
    .select(
      `
      slug,title,summary,recommended_for,difficulty,strengths,weaknesses,
      game_plan,mulligan_guide,card_choices,matchup_notes,
      recommendation_count,favorite_count,comment_count,copy_count,updated_at,
      hearthstone_classes(name_ko),
      archetypes(name_ko,strategy_type),
      profiles(display_name),
      deck_tags(tags(name_ko)),
      active_code:deck_codes!decks_current_deck_code_fk(
        raw_code,
        patches(version,is_current),
        deck_cards(quantity,sideboard_for_card_id,cards(name_ko,mana_cost,is_legendary))
      ),
      source_evidence(
        source_type,source_url,source_name,claimed_rank,wins,losses,
        evidence_status,evidence_note
      )
      `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return mapPublishedDeck(data as unknown as PublishedDeckRow);
}

export function mapPublishedDeck(row: PublishedDeckRow): Deck | null {
  const className = row.hearthstone_classes?.name_ko as DeckClass | undefined;
  const activeCode = row.active_code;
  if (!className || !activeCode) return null;

  const evidence = row.source_evidence[0];
  const cards = activeCode.deck_cards
    .filter((item) => item.sideboard_for_card_id === null && item.cards)
    .map((item) => ({
      cost: item.cards?.mana_cost ?? 0,
      name: item.cards?.name_ko ?? "알 수 없는 카드",
      quantity: item.quantity,
      legendary: item.cards?.is_legendary ?? false,
    }))
    .sort((left, right) => left.cost - right.cost || left.name.localeCompare(right.name, "ko"));

  return {
    slug: row.slug,
    title: row.title,
    className,
    archetype: row.archetypes?.name_ko ?? "커뮤니티 덱",
    strategy: strategyLabel(row.archetypes?.strategy_type),
    author: row.profiles?.display_name ?? "HearthDeck 유저",
    authorRole: "커뮤니티 기여자",
    patch: activeCode.patches?.version ?? "미확인",
    patchStatus: activeCode.patches?.is_current ? "현재 패치" : "이전 패치",
    evidence: evidenceLabel(evidence?.evidence_status),
    sourceType: sourceTypeLabel(evidence?.source_type),
    sourceLabel:
      evidence?.source_name ||
      evidence?.evidence_note ||
      "작성자가 직접 입력한 플레이 정보입니다.",
    sourceUrl: evidence?.source_url ?? undefined,
    rank: evidence?.claimed_rank ?? undefined,
    record:
      evidence?.wins !== null &&
      evidence?.wins !== undefined &&
      evidence.losses !== null
        ? `${evidence.wins}승 ${evidence.losses}패`
        : undefined,
    difficulty: difficultyLabel(row.difficulty),
    tags: row.deck_tags
      .map((item) => item.tags?.name_ko)
      .filter((tag): tag is string => Boolean(tag)),
    summary: row.summary,
    recommendedFor: row.recommended_for,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    gamePlan: textLines(row.game_plan),
    mulligan: { core: textLines(row.mulligan_guide), situational: [] },
    cardChoices: textLines(row.card_choices),
    matchupNotes: textLines(row.matchup_notes),
    cards,
    deckCode: activeCode.raw_code,
    recommendations: row.recommendation_count,
    favorites: row.favorite_count,
    comments: row.comment_count,
    copies: row.copy_count,
    updatedAt: new Date(row.updated_at).toLocaleDateString("ko-KR"),
  };
}

function textLines(value: string | null) {
  return value
    ? value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
}

function difficultyLabel(value: PublishedDeckRow["difficulty"]): Difficulty {
  return { easy: "쉬움", medium: "보통", hard: "어려움" }[value] as Difficulty;
}

function evidenceLabel(value: string | undefined): EvidenceStatus {
  return value === "reviewed"
    ? "운영진 확인"
    : value === "source_linked"
      ? "출처 연결"
      : "작성자 입력";
}

function sourceTypeLabel(value: string | undefined) {
  return (
    {
      community: "커뮤니티 덱",
      ranked: "등급전·랭커 덱",
      creator: "콘텐츠 제작자 덱",
      tournament: "대회 덱",
      external_stats: "외부 통계 덱",
    }[value ?? "community"] ?? "커뮤니티 덱"
  );
}

function strategyLabel(value: string | undefined) {
  return (
    {
      aggro: "어그로",
      tempo: "템포",
      midrange: "미드레인지",
      control: "컨트롤",
      combo: "콤보",
      other: "기타",
    }[value ?? "other"] ?? "기타"
  );
}
