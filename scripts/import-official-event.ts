import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import {
  buildOfficialEventImportSummary,
  persistOfficialEventImport,
} from "../src/server/deck-tracking/official-event-service";

async function main() {
  const write = process.argv.includes("--write");
  const inputPath =
    process.argv.find((argument) => argument.endsWith(".json")) ??
    "config/official-event.example.json";
  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const prepared = await buildOfficialEventImportSummary(payload);

  if (!write) {
    console.log(
      JSON.stringify(
        {
          mode: "dry-run",
          inputPath,
          ...prepared.summary,
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
  const imported = await persistOfficialEventImport({
    supabase,
    input: payload,
    inputLabel: inputPath,
  });
  console.log(JSON.stringify({ mode: "write", ...imported.result }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
