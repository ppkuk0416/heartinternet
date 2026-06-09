import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  buildCandidateImportPlan,
  parseCandidateBatch,
} from "../src/server/deck-tracking/candidate-import";
import { persistCandidatePlan } from "../src/server/deck-tracking/candidate-persistence";
import { validateCandidateCodes } from "../src/server/deck-tracking/candidate-validation";

async function main() {
  const write = process.argv.includes("--write");
  const inputPath =
    process.argv.find((argument) => argument.endsWith(".json")) ??
    "config/deck-candidates.example.json";
  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const initialPlan = buildCandidateImportPlan(parseCandidateBatch(payload));
  const plan = {
    ...initialPlan,
    items: await validateCandidateCodes(initialPlan.items),
  };

  if (!write) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          inputPath,
          source: plan.source,
          providerRevision: plan.providerRevision,
          candidates: plan.items.length,
          withDecodedCode: plan.items.filter((item) => item.rawDeckCode).length,
          fullyValidated: plan.items.filter(
            (item) => item.codeValidationStatus === "valid",
          ).length,
          validationFailed: plan.items.filter(
            (item) => item.codeValidationStatus === "invalid",
          ).length,
          warningCount:
            plan.warningCount +
            plan.items.filter(
              (item) =>
                item.codeValidationStatus === "invalid" ||
                item.codeValidationStatus === "unavailable",
            ).length,
          warnings: plan.items.flatMap((item) => [
            ...item.warnings.map((warning) => ({
              sourceUrl: item.sourceUrl,
              warning,
            })),
            ...item.codeValidationIssues.map((issue) => ({
              sourceUrl: item.sourceUrl,
              warning: issue.message,
            })),
          ]),
        },
        null,
        2,
      ),
    );
    return;
  }

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --write.",
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await persistCandidatePlan(supabase, plan, { inputPath });

  console.log(JSON.stringify({ mode: "write", ...result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
