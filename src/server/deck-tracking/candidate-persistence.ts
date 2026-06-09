import type { SupabaseClient } from "@supabase/supabase-js";
import type { buildCandidateImportPlan } from "@/server/deck-tracking/candidate-import";

type CandidatePlan = ReturnType<typeof buildCandidateImportPlan>;

export async function persistCandidatePlan(
  supabase: SupabaseClient,
  plan: CandidatePlan,
  metadata: Record<string, unknown>,
) {
  const attemptedAt = new Date().toISOString();
  const { data: source, error: sourceError } = await supabase
    .from("deck_tracking_sources")
    .upsert(
      {
        slug: plan.source.slug,
        name: plan.source.name,
        source_type: plan.source.sourceType,
        homepage_url: plan.source.homepageUrl,
        ingestion_mode: plan.source.ingestionMode,
        trust_tier: plan.source.trustTier,
        poll_interval_minutes: plan.source.pollIntervalMinutes,
        is_active: true,
        last_attempt_at: attemptedAt,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (sourceError) throw sourceError;

  const validationWarnings = plan.items.filter(
    (item) =>
      item.codeValidationStatus === "invalid" ||
      item.codeValidationStatus === "unavailable",
  ).length;
  const warningCount = plan.warningCount + validationWarnings;
  const { data: run, error: runError } = await supabase
    .from("deck_tracking_runs")
    .insert({
      source_id: source.id,
      provider_revision: plan.providerRevision,
      status: "running",
      discovered_count: plan.items.length,
      warning_count: warningCount,
      metadata,
    })
    .select("id")
    .single();
  if (runError) throw runError;

  try {
    const [
      { data: classes, error: classError },
      { data: patches, error: patchError },
    ] = await Promise.all([
      supabase.from("hearthstone_classes").select("id, slug"),
      supabase.from("patches").select("id, version"),
    ]);
    if (classError) throw classError;
    if (patchError) throw patchError;

    const classIdBySlug = new Map(classes.map((row) => [row.slug, row.id]));
    const patchIdByVersion = new Map(patches.map((row) => [row.version, row.id]));
    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of plan.items) {
      const { data: existing, error: existingError } = await supabase
        .from("deck_candidates")
        .select("id, observed_count, first_seen_at")
        .eq("source_id", source.id)
        .eq("fingerprint", item.fingerprint)
        .maybeSingle();
      if (existingError) throw existingError;

      const now = new Date().toISOString();
      const candidateRow = {
        source_id: source.id,
        fingerprint: item.fingerprint,
        cluster_key: item.clusterKey,
        external_id: item.externalId ?? null,
        source_url: item.sourceUrl,
        source_published_at: item.sourcePublishedAt ?? null,
        title: item.title ?? null,
        player_name: item.playerName ?? null,
        event_name: item.eventName ?? null,
        claimed_rank: item.claimedRank ?? null,
        raw_deck_code: item.rawDeckCode ?? null,
        code_hash: item.codeHash ?? null,
        code_validation_status: item.codeValidationStatus,
        code_validation_issues: item.codeValidationIssues,
        code_validated_at: item.codeValidatedAt ?? null,
        class_id: item.classSlug
          ? (classIdBySlug.get(item.classSlug) ?? null)
          : null,
        patch_id: item.patchVersion
          ? (patchIdByVersion.get(item.patchVersion) ?? null)
          : null,
        format: item.format,
        wins: item.wins ?? null,
        losses: item.losses ?? null,
        observed_count: (existing?.observed_count ?? 0) + 1,
        first_seen_at: existing?.first_seen_at ?? now,
        last_seen_at: now,
        metadata: {
          ...item.metadata,
          importWarnings: item.warnings,
        },
      };

      const candidateResult = existing
        ? await supabase
            .from("deck_candidates")
            .update(candidateRow)
            .eq("id", existing.id)
            .select("id")
            .single()
        : await supabase
            .from("deck_candidates")
            .insert(candidateRow)
            .select("id")
            .single();
      if (candidateResult.error) throw candidateResult.error;

      const { error: observationError } = await supabase
        .from("deck_candidate_observations")
        .upsert(
          {
            candidate_id: candidateResult.data.id,
            run_id: run.id,
            payload_hash: item.payloadHash,
            metadata: { sourceUrl: item.sourceUrl },
          },
          { onConflict: "candidate_id,run_id,payload_hash" },
        );
      if (observationError) throw observationError;

      if (existing) updatedCount += 1;
      else insertedCount += 1;
    }

    const finalStatus = warningCount > 0 ? "partial" : "succeeded";
    const finishedAt = new Date().toISOString();
    const { error: finishError } = await supabase
      .from("deck_tracking_runs")
      .update({
        status: finalStatus,
        inserted_count: insertedCount,
        updated_count: updatedCount,
        finished_at: finishedAt,
      })
      .eq("id", run.id);
    if (finishError) throw finishError;

    const { error: sourceFinishError } = await supabase
      .from("deck_tracking_sources")
      .update({ last_success_at: finishedAt })
      .eq("id", source.id);
    if (sourceFinishError) throw sourceFinishError;

    return {
      runId: run.id,
      status: finalStatus,
      insertedCount,
      updatedCount,
      warningCount,
    };
  } catch (error) {
    await supabase
      .from("deck_tracking_runs")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message.slice(0, 2000) : "Unknown error",
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    throw error;
  }
}

export async function recordCandidateSourceFailure(
  supabase: SupabaseClient,
  sourceConfig: CandidatePlan["source"],
  error: unknown,
  metadata: Record<string, unknown>,
) {
  const attemptedAt = new Date().toISOString();
  const { data: source, error: sourceError } = await supabase
    .from("deck_tracking_sources")
    .upsert(
      {
        slug: sourceConfig.slug,
        name: sourceConfig.name,
        source_type: sourceConfig.sourceType,
        homepage_url: sourceConfig.homepageUrl,
        ingestion_mode: sourceConfig.ingestionMode,
        trust_tier: sourceConfig.trustTier,
        poll_interval_minutes: sourceConfig.pollIntervalMinutes,
        is_active: true,
        last_attempt_at: attemptedAt,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (sourceError) throw sourceError;

  const message =
    error instanceof Error ? error.message.slice(0, 2000) : "Unknown error";
  const { error: runError } = await supabase.from("deck_tracking_runs").insert({
    source_id: source.id,
    status: "failed",
    error_message: message,
    metadata,
    finished_at: attemptedAt,
  });
  if (runError) throw runError;
}

export async function recordEmptyCandidateSourceSuccess(
  supabase: SupabaseClient,
  sourceConfig: CandidatePlan["source"],
  providerRevision: string,
  metadata: Record<string, unknown>,
) {
  const finishedAt = new Date().toISOString();
  const { data: source, error: sourceError } = await supabase
    .from("deck_tracking_sources")
    .upsert(
      {
        slug: sourceConfig.slug,
        name: sourceConfig.name,
        source_type: sourceConfig.sourceType,
        homepage_url: sourceConfig.homepageUrl,
        ingestion_mode: sourceConfig.ingestionMode,
        trust_tier: sourceConfig.trustTier,
        poll_interval_minutes: sourceConfig.pollIntervalMinutes,
        is_active: true,
        last_attempt_at: finishedAt,
        last_success_at: finishedAt,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (sourceError) throw sourceError;

  const { data: run, error: runError } = await supabase
    .from("deck_tracking_runs")
    .insert({
      source_id: source.id,
      status: "succeeded",
      provider_revision: providerRevision,
      discovered_count: 0,
      finished_at: finishedAt,
      metadata,
    })
    .select("id")
    .single();
  if (runError) throw runError;
  return run.id as string;
}
