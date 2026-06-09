import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { fetchHearthstoneJsonCards } from "../src/server/cards/hearthstone-json.ts";
import { buildCardSyncPlan } from "../src/server/cards/sync-plan.ts";

const write = process.argv.includes("--write");
const legality = JSON.parse(
  await readFile("config/hearthstone-standard.json", "utf8"),
);
const result = await fetchHearthstoneJsonCards({ legality });

if (!write) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        provider: result.provider,
        revision: result.revision,
        fetchedAt: result.fetchedAt,
        cards: result.cards.length,
        standardLegal: result.cards.filter((card) => card.isStandardLegal).length,
        warnings: result.warnings.slice(0, 20),
        warningCount: result.warnings.length,
      },
      null,
      2,
    ),
  );
  process.exit(0);
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

const { data: classRows, error: classError } = await supabase
  .from("hearthstone_classes")
  .select("id, slug");
if (classError) throw classError;
const classIdBySlug = new Map(classRows.map((row) => [row.slug, row.id]));

const { data: existingRows, error: existingError } = await supabase
  .from("cards")
  .select("dbf_id, card_id");
if (existingError) throw existingError;

const plan = buildCardSyncPlan(
  result.cards,
  existingRows.map((row) => ({
    dbfId: row.dbf_id,
    cardId: row.card_id,
  })),
);

const { data: run, error: runError } = await supabase
  .from("card_sync_runs")
  .insert({
    provider: result.provider,
    provider_revision: result.revision,
    status: "running",
    fetched_count: result.cards.length,
    warning_count: result.warnings.length,
    metadata: {
      legalityVerifiedAt: legality.verifiedAt,
      missingExistingDbfIds: plan.missingExistingDbfIds.slice(0, 100),
    },
  })
  .select("id")
  .single();
if (runError) throw runError;

try {
  let upsertedCount = 0;
  for (const chunk of chunks(plan.upserts, 500)) {
    const rows = chunk.map((card) => ({
      dbf_id: card.dbfId,
      card_id: card.cardId,
      name_ko: card.nameKo,
      name_en: card.nameEn,
      class_id: card.classSlug
        ? (classIdBySlug.get(card.classSlug) ?? null)
        : null,
      card_type: card.cardType,
      mana_cost: card.manaCost,
      rarity: card.rarity,
      set_slug: card.setSlug,
      crafting_cost: card.craftingCost,
      image_url_ko: card.imageUrlKo,
      is_collectible: card.isCollectible,
      is_standard_legal: card.isStandardLegal,
      is_legendary: card.isLegendary,
      is_active: card.isActive,
      last_synced_at: result.fetchedAt,
    }));
    const { data: upsertedCards, error } = await supabase
      .from("cards")
      .upsert(rows, { onConflict: "dbf_id" })
      .select("id, dbf_id");
    if (error) throw error;

    const cardUuidByDbfId = new Map(
      upsertedCards.map((card) => [card.dbf_id, card.id]),
    );
    const cardIds = upsertedCards.map((card) => card.id);
    const { error: deleteClassError } = await supabase
      .from("card_classes")
      .delete()
      .in("card_id", cardIds);
    if (deleteClassError) throw deleteClassError;

    const membershipRows = chunk.flatMap((card) => {
      const cardId = cardUuidByDbfId.get(card.dbfId);
      if (!cardId) return [];
      return card.classSlugs.flatMap((classSlug) => {
        const classId = classIdBySlug.get(classSlug);
        return classId ? [{ card_id: cardId, class_id: classId }] : [];
      });
    });
    if (membershipRows.length > 0) {
      const { error: classUpsertError } = await supabase
        .from("card_classes")
        .upsert(membershipRows, { onConflict: "card_id,class_id" });
      if (classUpsertError) throw classUpsertError;
    }
    upsertedCount += rows.length;
  }

  const { error: completeError } = await supabase
    .from("card_sync_runs")
    .update({
      status: "succeeded",
      upserted_count: upsertedCount,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  if (completeError) throw completeError;

  console.log(
    JSON.stringify(
      {
        mode: "write",
        revision: result.revision,
        upsertedCount,
        unchangedIdentityCount: plan.unchangedCount,
        missingExistingCount: plan.missingExistingDbfIds.length,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await supabase
    .from("card_sync_runs")
    .update({
      status: "failed",
      error_message:
        error instanceof Error ? error.message.slice(0, 2000) : "Unknown error",
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id);
  throw error;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
