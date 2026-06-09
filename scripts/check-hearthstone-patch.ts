import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  comparePatchVersions,
  fetchLatestOfficialPatch,
  requiresCardLegalityReview,
} from "../src/server/patches/blizzard-news";

async function main() {
  const write = process.argv.includes("--write");
  const approve = process.argv.includes("--approve");
  const cardLegalityReviewed =
    process.argv.includes("--approve-card-legality") ||
    process.env.CARD_LEGALITY_REVIEWED === "true";
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (write && (!url || !serviceRoleKey)) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --write.",
    );
  }

  const supabase =
    url && serviceRoleKey
      ? createClient(url, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  const currentPromise = supabase
    ? supabase
        .from("patches")
        .select("version,released_at,notes_url")
        .eq("is_current", true)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            throw error ?? new Error("Current patch is missing");
          }
          return data;
        })
    : loadConfiguredPatch();
  const [current, detected] = await Promise.all([
    currentPromise,
    fetchLatestOfficialPatch(),
  ]);

  const comparison = comparePatchVersions(detected.version, current.version);
  const plan = {
    mode: write ? "write" : "check",
    status:
      comparison > 0
        ? "new_patch_detected"
        : comparison === 0
          ? "up_to_date"
          : "configured_patch_ahead",
    current,
    detected,
    requiresCardLegalityReview: requiresCardLegalityReview(
      current.version,
      detected.version,
    ),
  };

  if (!write || comparison <= 0) {
    console.log(JSON.stringify(plan, null, 2));
    if (!write && comparison > 0) process.exitCode = 2;
    return;
  }
  if (!approve) {
    throw new Error("Patch activation requires both --write and --approve.");
  }
  if (plan.requiresCardLegalityReview && !cardLegalityReviewed) {
    throw new Error(
      "This patch requires reviewed Standard card legality. Set CARD_LEGALITY_REVIEWED=true after updating config/hearthstone-standard.json.",
    );
  }
  if (!supabase) throw new Error("Supabase is required to activate a patch.");

  const { data, error: activationError } = await supabase.rpc(
    "activate_hearthstone_patch",
    {
      p_version: detected.version,
      p_released_at: detected.releasedAt,
      p_notes_url: detected.notesUrl,
      p_requires_card_review: plan.requiresCardLegalityReview,
    },
  );
  if (activationError) throw activationError;
  console.log(JSON.stringify({ ...plan, status: "activated", result: data }, null, 2));
}

async function loadConfiguredPatch() {
  const config = JSON.parse(
    await readFile("config/deck-feed-sources.json", "utf8"),
  ) as { sources?: Array<{ patchVersion?: string }> };
  const version = config.sources?.[0]?.patchVersion;
  if (!version) throw new Error("Configured patch version is missing");
  return { version, released_at: null, notes_url: null };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
