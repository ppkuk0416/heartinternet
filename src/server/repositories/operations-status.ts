import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isErrorMonitoringConfigured } from "@/server/observability/error-monitoring";
import {
  buildOperationsStatusSummary,
  type OperationsStatusSummary,
} from "@/server/operations/status-summary";

type CardSyncRow = {
  status: "running" | "succeeded" | "failed";
  finished_at: string | null;
};

type PatchRow = {
  version: string;
};

type PatchTransitionRow = {
  created_at: string;
  requires_card_review: boolean;
};

type SourceRow = {
  last_success_at: string | null;
  poll_interval_minutes: number;
};

export async function getOperationsStatusSummary({
  client,
}: {
  client?: SupabaseClient;
} = {}): Promise<OperationsStatusSummary> {
  const supabase = client ?? (await createServerSupabaseClient());
  if (!supabase) {
    return buildOperationsStatusSummary({
      generatedAt: new Date().toISOString(),
      unavailable: true,
      tracking: emptyTracking(),
      moderation: { openReports: 0, reviewingReports: 0 },
      content: emptyContent(),
      cards: { latestStatus: "missing" },
      patch: { requiresCardReview: false },
      analytics: { events24h: 0 },
      monitoring: { configured: isErrorMonitoringConfigured() },
    });
  }

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1_000).toISOString();

  const [
    recentRuns,
    failedRuns,
    runningRuns,
    sources,
    openReports,
    reviewingReports,
    reviewCandidates,
    validationCandidates,
    staleCandidates,
    latestCardSync,
    currentPatch,
    latestTransition,
    analyticsEvents,
  ] = await Promise.all([
    countRows(supabase.from("deck_tracking_runs").select("id", { count: "exact", head: true }).gte("started_at", since24h)),
    countRows(supabase.from("deck_tracking_runs").select("id", { count: "exact", head: true }).gte("started_at", since24h).eq("status", "failed")),
    countRows(supabase.from("deck_tracking_runs").select("id", { count: "exact", head: true }).eq("status", "running")),
    supabase
      .from("deck_tracking_sources")
      .select("last_success_at,poll_interval_minutes")
      .eq("is_active", true),
    countRows(supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
    countRows(supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "reviewing")),
    countRows(supabase.from("deck_candidates").select("id", { count: "exact", head: true }).eq("status", "ready_for_review")),
    countRows(supabase.from("deck_candidates").select("id", { count: "exact", head: true }).eq("status", "needs_validation")),
    countRows(supabase.from("deck_candidates").select("id", { count: "exact", head: true }).eq("status", "stale")),
    supabase
      .from("card_sync_runs")
      .select("status,finished_at")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("patches")
      .select("version")
      .eq("is_current", true)
      .maybeSingle(),
    supabase
      .from("patch_transitions")
      .select("created_at,requires_card_review")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    countRows(supabase.from("product_events").select("id", { count: "exact", head: true }).gte("created_at", since24h)),
  ]);

  const hasError = [
    recentRuns,
    failedRuns,
    runningRuns,
    openReports,
    reviewingReports,
    reviewCandidates,
    validationCandidates,
    staleCandidates,
    analyticsEvents,
  ].some((result) => result.error);

  if (
    hasError ||
    sources.error ||
    latestCardSync.error ||
    currentPatch.error ||
    latestTransition.error
  ) {
    return buildOperationsStatusSummary({
      generatedAt: now.toISOString(),
      unavailable: true,
      tracking: emptyTracking(),
      moderation: { openReports: 0, reviewingReports: 0 },
      content: emptyContent(),
      cards: { latestStatus: "missing" },
      patch: { requiresCardReview: false },
      analytics: { events24h: 0 },
      monitoring: { configured: isErrorMonitoringConfigured() },
    });
  }

  const activeSources = ((sources.data ?? []) as unknown as SourceRow[]);
  const staleActiveSources = activeSources.filter((source) =>
    sourceIsStale(source, now),
  ).length;
  const cardSync = latestCardSync.data as CardSyncRow | null;
  const patch = currentPatch.data as PatchRow | null;
  const transition = latestTransition.data as PatchTransitionRow | null;

  return buildOperationsStatusSummary({
    generatedAt: now.toISOString(),
    tracking: {
      recentRuns: recentRuns.count,
      failedRuns: failedRuns.count,
      runningRuns: runningRuns.count,
      staleActiveSources,
      activeSources: activeSources.length,
    },
    moderation: {
      openReports: openReports.count,
      reviewingReports: reviewingReports.count,
    },
    content: {
      reviewCandidates: reviewCandidates.count,
      needsValidationCandidates: validationCandidates.count,
      staleCandidates: staleCandidates.count,
    },
    cards: {
      latestStatus: cardSync?.status ?? "missing",
      latestFinishedAt: cardSync?.finished_at ?? undefined,
    },
    patch: {
      currentVersion: patch?.version,
      latestTransitionAt: transition?.created_at,
      requiresCardReview: transition?.requires_card_review ?? false,
    },
    analytics: {
      events24h: analyticsEvents.count,
    },
    monitoring: {
      configured: isErrorMonitoringConfigured(),
    },
  });
}

async function countRows(
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
) {
  const result = await query;
  return {
    count: result.count ?? 0,
    error: result.error,
  };
}

function emptyTracking() {
  return {
    recentRuns: 0,
    failedRuns: 0,
    runningRuns: 0,
    staleActiveSources: 0,
    activeSources: 0,
  };
}

function emptyContent() {
  return {
    reviewCandidates: 0,
    needsValidationCandidates: 0,
    staleCandidates: 0,
  };
}

function sourceIsStale(source: SourceRow, now: Date) {
  if (!source.last_success_at) return true;
  const lastSuccessAt = new Date(source.last_success_at).getTime();
  const allowedDelayMs = source.poll_interval_minutes * 2 * 60 * 1_000;
  return now.getTime() - lastSuccessAt > allowedDelayMs;
}
