import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  AtomDeckFeedConfigSchema,
  fetchAtomDeckFeed,
} from "../src/server/deck-tracking/atom-feed";
import {
  buildCandidateImportPlan,
  parseCandidateBatch,
} from "../src/server/deck-tracking/candidate-import";
import {
  persistCandidatePlan,
  recordEmptyCandidateSourceSuccess,
  recordCandidateSourceFailure,
} from "../src/server/deck-tracking/candidate-persistence";
import { validateCandidateCodes } from "../src/server/deck-tracking/candidate-validation";

const ConfigSchema = z.object({
  sources: z.array(AtomDeckFeedConfigSchema).min(1).max(20),
});

async function main() {
  const write = process.argv.includes("--write");
  const configPath =
    process.argv.find((argument) => argument.endsWith(".json")) ??
    "config/deck-feed-sources.json";
  const config = ConfigSchema.parse(
    JSON.parse(await readFile(configPath, "utf8")),
  );

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (write && (!url || !serviceRoleKey)) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --write.",
    );
  }
  const supabase =
    write && url && serviceRoleKey
      ? createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  let currentPatchVersion: string | null = null;
  if (supabase) {
    const { data, error } = await supabase
      .from("patches")
      .select("version")
      .eq("is_current", true)
      .single();
    if (error || !data) {
      throw error ?? new Error("Current patch is not configured");
    }
    currentPatchVersion = data.version;
  }

  const results = [];
  for (const sourceConfig of config.sources) {
    const effectiveSourceConfig = currentPatchVersion
      ? { ...sourceConfig, patchVersion: currentPatchVersion }
      : sourceConfig;
    try {
      const batch = await fetchAtomDeckFeed(effectiveSourceConfig);
      if (batch.items.length === 0) {
        const runId = supabase
          ? await recordEmptyCandidateSourceSuccess(
              supabase,
              effectiveSourceConfig.source,
              batch.providerRevision,
              {
                configPath,
                feedUrl: effectiveSourceConfig.feedUrl,
                patchVersion: effectiveSourceConfig.patchVersion,
              },
            )
          : undefined;
        results.push({
          source: effectiveSourceConfig.source.slug,
          status: "no_candidates",
          candidates: 0,
          runId,
        });
        continue;
      }
      const initialPlan = buildCandidateImportPlan(parseCandidateBatch(batch));
      const plan = {
        ...initialPlan,
        items: await validateCandidateCodes(initialPlan.items),
      };
      const summary = {
        source: effectiveSourceConfig.source.slug,
        patchVersion: effectiveSourceConfig.patchVersion,
        candidates: plan.items.length,
        fullyValidated: plan.items.filter(
          (item) => item.codeValidationStatus === "valid",
        ).length,
        needsValidation: plan.items.filter(
          (item) => item.codeValidationStatus !== "valid",
        ).length,
        preview: plan.items.slice(0, 10).map((item) => ({
          title: item.title,
          playerName: item.playerName,
          classSlug: item.classSlug,
          format: item.format,
          validation: item.codeValidationStatus,
          sourceUrl: item.sourceUrl,
          issues: item.codeValidationIssues.map((issue) => issue.code),
        })),
      };

      results.push(
        supabase
          ? {
              ...summary,
              ...(await persistCandidatePlan(supabase, plan, {
                configPath,
                feedUrl: effectiveSourceConfig.feedUrl,
                patchVersion: effectiveSourceConfig.patchVersion,
              })),
            }
          : { ...summary, status: "dry_run" },
      );
    } catch (error) {
      if (supabase) {
        try {
          await recordCandidateSourceFailure(
            supabase,
            effectiveSourceConfig.source,
            error,
            {
              configPath,
              feedUrl: effectiveSourceConfig.feedUrl,
              patchVersion: effectiveSourceConfig.patchVersion,
            },
          );
        } catch (recordError) {
          console.error("Failed to record source failure:", recordError);
        }
      }
      results.push({
        source: effectiveSourceConfig.source.slug,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log(JSON.stringify({ mode: write ? "write" : "dry-run", results }, null, 2));
  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
