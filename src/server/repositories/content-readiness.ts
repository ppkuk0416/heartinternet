import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildContentReadinessSummary,
  type ContentReadinessSummary,
} from "@/server/content/readiness-summary";

type PublishedDeckReadinessRow = {
  id: string;
  class_id: number;
  difficulty: "easy" | "medium" | "hard";
  game_plan: string;
  mulligan_guide: string;
  active_code: {
    patches: {
      version: string;
      is_current: boolean;
    } | null;
  } | null;
  source_evidence: Array<{
    evidence_status: "self_reported" | "source_linked" | "reviewed" | "rejected";
  }> | null;
  deck_tags: Array<{
    tags: {
      slug: string;
      name_ko: string;
    } | null;
  }> | null;
};

export async function getContentReadinessSummary({
  client,
}: {
  client?: SupabaseClient;
} = {}): Promise<ContentReadinessSummary> {
  const supabase = client ?? (await createServerSupabaseClient());
  if (!supabase) return emptySummary(true);

  const [decksResult, patchResult] = await Promise.all([
    supabase
      .from("decks")
      .select(
        `
        id,class_id,difficulty,game_plan,mulligan_guide,
        active_code:deck_codes!decks_current_deck_code_fk(
          patches(version,is_current)
        ),
        source_evidence(evidence_status),
        deck_tags(tags(slug,name_ko))
        `,
      )
      .eq("status", "published")
      .is("deleted_at", null),
    supabase
      .from("patches")
      .select("version")
      .eq("is_current", true)
      .maybeSingle(),
  ]);

  if (decksResult.error || patchResult.error) return emptySummary(true);

  const rows = (decksResult.data ?? []) as unknown as PublishedDeckReadinessRow[];
  const currentRows = rows.filter((row) => row.active_code?.patches?.is_current);
  const representedClasses = new Set(currentRows.map((row) => row.class_id)).size;
  const trustedCurrentDecks = currentRows.filter(hasTrustedEvidence).length;
  const beginnerCurrentDecks = currentRows.filter(isBeginnerDeck).length;
  const guideCompleteCurrentDecks = currentRows.filter(hasCompleteGuide).length;

  return buildContentReadinessSummary({
    currentPatch: (patchResult.data as { version: string } | null)?.version,
    totals: {
      published: rows.length,
      currentPatchPublished: currentRows.length,
      representedClasses,
      trustedCurrentDecks,
      beginnerCurrentDecks,
      guideCompleteCurrentDecks,
    },
  });
}

function emptySummary(unavailable: boolean) {
  return buildContentReadinessSummary({
    unavailable,
    totals: {
      published: 0,
      currentPatchPublished: 0,
      representedClasses: 0,
      trustedCurrentDecks: 0,
      beginnerCurrentDecks: 0,
      guideCompleteCurrentDecks: 0,
    },
  });
}

function hasTrustedEvidence(row: PublishedDeckReadinessRow) {
  return (row.source_evidence ?? []).some(
    (evidence) =>
      evidence.evidence_status === "source_linked" ||
      evidence.evidence_status === "reviewed",
  );
}

function isBeginnerDeck(row: PublishedDeckReadinessRow) {
  if (row.difficulty === "easy") return true;
  return (row.deck_tags ?? []).some((item) => {
    const tag = item.tags;
    return tag?.slug === "beginner" || tag?.name_ko === "초보 추천";
  });
}

function hasCompleteGuide(row: PublishedDeckReadinessRow) {
  return (
    row.game_plan.trim().length >= 20 &&
    row.mulligan_guide.trim().length >= 10
  );
}
