import type { SupabaseClient } from "@supabase/supabase-js";
import { validateCandidateCodes } from "@/server/deck-tracking/candidate-validation";
import {
  buildCandidateImportPlan,
} from "@/server/deck-tracking/candidate-import";
import {
  buildOfficialEventImport,
  type OfficialEventVerification,
} from "@/server/deck-tracking/official-event";
import { persistCandidatePlan } from "@/server/deck-tracking/candidate-persistence";

type OfficialEventPlan = ReturnType<typeof buildCandidateImportPlan>;

export type OfficialEventImportSummary = {
  eventVerification: OfficialEventVerification;
  source: {
    slug: string;
    name: string;
    sourceType: string;
    trustTier: number;
  };
  providerRevision?: string;
  candidates: number;
  fullyValidated: number;
  validationFailed: number;
  codeProvenance: "operator_manifest";
  warningCount: number;
  warnings: string[];
};

export async function buildOfficialEventImportSummary(input: unknown) {
  const officialImport = await buildOfficialEventImport({ input });
  const plan = {
    ...officialImport.plan,
    items: await validateCandidateCodes(officialImport.plan.items),
  };

  return {
    officialImport,
    plan,
    summary: summarizeOfficialEventImport(
      officialImport.verification,
      plan,
    ),
  };
}

export async function persistOfficialEventImport({
  supabase,
  input,
  inputLabel,
}: {
  supabase: SupabaseClient;
  input: unknown;
  inputLabel: string;
}) {
  const prepared = await buildOfficialEventImportSummary(input);
  const blockedCandidates = prepared.plan.items.filter(
    (item) => item.codeValidationStatus !== "valid",
  );
  if (blockedCandidates.length > 0) {
    throw new Error(
      `Write blocked: ${blockedCandidates.length} official-event submission(s) do not have a valid current-format deck code.`,
    );
  }

  const patchVersion = prepared.officialImport.manifest.event.patchVersion;
  const { data: patch, error: patchError } = await supabase
    .from("patches")
    .select("id")
    .eq("version", patchVersion)
    .maybeSingle();
  if (patchError) throw patchError;
  if (!patch) {
    throw new Error(
      `Patch ${patchVersion} is not configured. Add or activate it before importing the event.`,
    );
  }

  const result = await persistCandidatePlan(supabase, prepared.plan, {
    inputLabel,
    officialEventVerification: prepared.officialImport.verification,
    deckCodeProvenance: "operator_manifest",
  });

  return {
    ...prepared,
    result,
  };
}

function summarizeOfficialEventImport(
  verification: OfficialEventVerification,
  plan: OfficialEventPlan,
): OfficialEventImportSummary {
  const validationWarnings = plan.items.filter(
    (item) =>
      item.codeValidationStatus === "invalid" ||
      item.codeValidationStatus === "unavailable",
  );

  return {
    eventVerification: verification,
    source: {
      slug: plan.source.slug,
      name: plan.source.name,
      sourceType: plan.source.sourceType,
      trustTier: plan.source.trustTier,
    },
    providerRevision: plan.providerRevision,
    candidates: plan.items.length,
    fullyValidated: plan.items.filter(
      (item) => item.codeValidationStatus === "valid",
    ).length,
    validationFailed: plan.items.filter(
      (item) => item.codeValidationStatus === "invalid",
    ).length,
    codeProvenance: "operator_manifest",
    warningCount: plan.warningCount + validationWarnings.length,
    warnings: plan.items.flatMap((item) => [
      ...item.warnings,
      ...item.codeValidationIssues.map((issue) => issue.message),
    ]),
  };
}
