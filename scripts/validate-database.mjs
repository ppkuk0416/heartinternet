import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const seedPath = "supabase/seed.sql";

const db = new PGlite();

try {
  await db.exec(`
    create schema if not exists auth;
    create schema if not exists extensions;
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create table auth.users (
      id uuid primary key,
      email text,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    create or replace function auth.role()
    returns text
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.role', true), '')
    $$;

    create or replace function extensions.gen_random_uuid()
    returns uuid
    language sql
    volatile
    as $$
      select pg_catalog.gen_random_uuid()
    $$;

    grant usage on schema auth, extensions to anon, authenticated, service_role;
    grant execute on function auth.uid(), auth.role()
      to anon, authenticated, service_role;
    grant execute on function extensions.gen_random_uuid()
      to anon, authenticated, service_role;
  `);

  const migrationFiles = (await readdir("supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const migrationFile of migrationFiles) {
    const migration = makePgliteCompatible(
      await readFile(`supabase/migrations/${migrationFile}`, "utf8"),
    );
    await db.exec(migration);
  }
  await db.exec(await readFile(seedPath, "utf8"));

  await assertSchema();
  await assertAuthorizationAndConstraints();

  console.log("Database migration validation passed.");
} finally {
  await db.close();
}

function makePgliteCompatible(sql) {
  return sql
    .replace(
      /create extension if not exists (pgcrypto|pg_trgm) with schema extensions;\n/g,
      "",
    )
    .replace(
      /create index decks_title_trgm_idx[\s\S]*?;\ncreate index archetypes_name_ko_trgm_idx[\s\S]*?;\n/,
      "",
    );
}

async function assertSchema() {
  const tables = await db.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
  `);
  const names = new Set(tables.rows.map((row) => row.table_name));
  for (const expected of [
    "profiles",
    "decks",
    "deck_codes",
    "deck_cards",
    "source_evidence",
    "deck_likes",
    "favorites",
    "comments",
    "reports",
    "moderation_audits",
    "card_sync_runs",
    "card_classes",
    "deck_tracking_sources",
    "deck_tracking_runs",
    "deck_candidates",
    "deck_candidate_observations",
    "patch_transitions",
  ]) {
    assert(names.has(expected), `missing table: ${expected}`);
  }

  const referenceCounts = await db.query(`
    select
      (select count(*)::integer from public.hearthstone_classes) as classes,
      (select count(*)::integer from public.archetypes) as archetypes,
      (select count(*)::integer from public.tags) as tags,
      (select count(*)::integer from public.patches where is_current) as current_patches
  `);
  assertEqual(referenceCounts.rows[0].classes, 11, "class seed count");
  assertEqual(referenceCounts.rows[0].archetypes, 6, "archetype seed count");
  assertEqual(referenceCounts.rows[0].tags, 7, "tag seed count");
  assertEqual(referenceCounts.rows[0].current_patches, 1, "current patch count");
}

async function assertAuthorizationAndConstraints() {
  const ownerId = "30000000-0000-4000-8000-000000000001";
  const otherId = "30000000-0000-4000-8000-000000000002";
  const moderatorId = "30000000-0000-4000-8000-000000000003";

  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data)
    values
      ('${ownerId}', 'owner@example.com', '{"display_name":"Owner"}'),
      ('${otherId}', 'other@example.com', '{"display_name":"Other"}'),
      ('${moderatorId}', 'moderator@example.com', '{"display_name":"Moderator"}');

    alter table public.profiles disable trigger profiles_protect_privileges;
    update public.profiles set role = 'moderator' where id = '${moderatorId}';
    alter table public.profiles enable trigger profiles_protect_privileges;

    insert into public.cards (
      dbf_id, card_id, name_ko, name_en, class_id, card_type,
      mana_cost, set_slug, is_collectible, is_standard_legal, is_legendary
    ) values (
      7, 'HERO_7', '테스트 전사', 'Test Warrior', 11, 'HERO',
      0, 'test', false, true, false
    );
  `);

  const cardValues = Array.from({ length: 15 }, (_, index) => {
    const id = 1000 + index;
    return `(${id}, 'CARD_${id}', '테스트 카드 ${index + 1}', 'Test Card ${
      index + 1
    }', null, 'MINION', ${index % 8}, 'test', true, true, false)`;
  }).join(",\n");
  await db.exec(`
    insert into public.cards (
      dbf_id, card_id, name_ko, name_en, class_id, card_type,
      mana_cost, set_slug, is_collectible, is_standard_legal, is_legendary
    ) values ${cardValues};
  `);

  await setUser(ownerId);

  const rpcCards = JSON.stringify(
    Array.from({ length: 15 }, (_, index) => ({
      dbf_id: 1000 + index,
      quantity: 2,
      owner_dbf_id: null,
    })),
  ).replaceAll("'", "''");
  const rpcDraft = await db.query(`
    select *
    from public.create_deck_draft(
      'RPC 검증 초안',
      '초안 저장 후 공개 전환을 검증하기 위한 충분히 긴 설명입니다.',
      '정규전을 시작하는 테스트 사용자',
      'medium',
      '초반에는 필드를 잡고 중반부터 상대 영웅에게 피해를 누적합니다.',
      '1비용과 2비용 카드를 우선해서 찾습니다.',
      '',
      '',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('b', 64),
      'database-test',
      'warrior',
      7,
      '${rpcCards}'::jsonb
    )
  `);
  const rpcDraftId = rpcDraft.rows[0].deck_id;
  const rpcDraftState = await db.query(`
    select
      d.status,
      d.author_id,
      d.current_deck_code_id is not null as has_active_code,
      coalesce(sum(dc.quantity) filter (where dc.sideboard_for_card_id is null), 0)::integer as card_count
    from public.decks d
    join public.deck_codes code on code.id = d.current_deck_code_id
    join public.deck_cards dc on dc.deck_code_id = code.id
    where d.id = '${rpcDraftId}'
    group by d.id
  `);
  assertEqual(rpcDraftState.rows[0].status, "draft", "RPC draft status");
  assertEqual(rpcDraftState.rows[0].author_id, ownerId, "RPC draft owner");
  assertEqual(
    rpcDraftState.rows[0].has_active_code,
    true,
    "RPC active deck code",
  );
  assertEqual(rpcDraftState.rows[0].card_count, 30, "RPC deck card count");
  await db.exec(`
    insert into public.source_evidence (
      deck_id, source_type, evidence_status, evidence_note
    ) values (
      '${rpcDraftId}', 'community', 'self_reported', '초안 공개 검증'
    );
  `);
  const republishedDraft = await db.query(`
    select * from public.publish_deck_draft('${rpcDraftId}')
  `);
  assertEqual(
    republishedDraft.rows[0].deck_status,
    "published",
    "existing draft publish status",
  );

  const rpcPublished = await db.query(`
    select *
    from public.create_deck_submission(
      'RPC 공개 검증 덱',
      '공개 트랜잭션과 근거 저장을 함께 검증하는 충분히 긴 설명입니다.',
      '정규전을 시작하는 테스트 사용자',
      'medium',
      '초반에는 필드를 잡고 중반부터 상대 영웅에게 피해를 누적합니다.',
      '1비용과 2비용 카드를 우선해서 찾습니다.',
      '',
      '',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('c', 64),
      'database-test',
      'warrior',
      7,
      '${rpcCards}'::jsonb,
      'ranked',
      'https://example.com/source',
      '테스트 등급전',
      '전설 1000위',
      7,
      3,
      '2026-06-01',
      '2026-06-06',
      '10게임 기록',
      true
    )
  `);
  const rpcPublishedId = rpcPublished.rows[0].deck_id;
  assertEqual(
    rpcPublished.rows[0].deck_status,
    "published",
    "RPC published status",
  );
  const rpcPublishedState = await db.query(`
    select
      d.published_at is not null as has_published_at,
      se.evidence_status,
      se.wins,
      se.losses
    from public.decks d
    join public.source_evidence se on se.deck_id = d.id
    where d.id = '${rpcPublishedId}'
  `);
  assertEqual(
    rpcPublishedState.rows[0].has_published_at,
    true,
    "RPC published timestamp",
  );
  assertEqual(
    rpcPublishedState.rows[0].evidence_status,
    "source_linked",
    "RPC evidence status",
  );
  assertEqual(rpcPublishedState.rows[0].wins, 7, "RPC evidence wins");
  assertEqual(rpcPublishedState.rows[0].losses, 3, "RPC evidence losses");

  await db.exec("reset role");
  await db.exec("set role service_role");
  const candidateScore = await db.query(`
    select public.calculate_deck_candidate_priority(
      3::smallint, 12, 4, true, true, true
    ) as score
  `);
  assertEqual(candidateScore.rows[0].score, 100, "candidate priority score cap");

  const trackingSource = await db.query(`
    insert into public.deck_tracking_sources (
      slug, name, source_type, homepage_url, ingestion_mode, trust_tier
    ) values (
      'database-tracking-source',
      'Database Tracking Source',
      'ranked',
      'https://example.com',
      'api',
      3
    )
    returning id
  `);
  const trackingSourceId = trackingSource.rows[0].id;
  const trackingRun = await db.query(`
    insert into public.deck_tracking_runs (source_id, status)
    values ('${trackingSourceId}', 'running')
    returning id
  `);
  const trackingRunId = trackingRun.rows[0].id;
  const trackingCandidate = await db.query(`
    insert into public.deck_candidates (
      source_id, fingerprint, cluster_key, source_url,
      source_published_at, raw_deck_code, code_hash, patch_id,
      code_validation_status, code_validated_at,
      class_id, format, wins, losses, observed_count
    ) values (
      '${trackingSourceId}',
      repeat('d', 64),
      repeat('e', 64),
      'https://example.com/decks/1',
      now() - interval '2 hours',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('e', 64),
      '00000000-0000-4000-8000-000000000356',
      'valid',
      now(),
      11,
      'standard',
      5,
      2,
      2
    )
    returning id, status, priority_score
  `);
  const trackingCandidateId = trackingCandidate.rows[0].id;
  assertEqual(
    trackingCandidate.rows[0].status,
    "ready_for_review",
    "tracked code candidate review state",
  );
  assert(
    trackingCandidate.rows[0].priority_score >= 90,
    "trusted current candidate receives high priority",
  );
  const pendingCandidate = await db.query(`
    insert into public.deck_candidates (
      source_id, fingerprint, cluster_key, source_url,
      source_published_at, raw_deck_code, code_hash, patch_id,
      code_validation_status, class_id, format, observed_count
    ) values (
      '${trackingSourceId}',
      repeat('1', 64),
      repeat('2', 64),
      'https://example.com/decks/pending',
      now() - interval '1 hour',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('2', 64),
      '00000000-0000-4000-8000-000000000356',
      'pending',
      11,
      'standard',
      1
    )
    returning id, status
  `);
  assertEqual(
    pendingCandidate.rows[0].status,
    "needs_validation",
    "pending code candidate remains outside review-ready queue",
  );
  await db.exec(`
    insert into public.deck_candidate_observations (
      candidate_id, run_id, payload_hash
    ) values (
      '${trackingCandidateId}', '${trackingRunId}', repeat('f', 64)
    );
  `);
  await setUser(moderatorId);
  await expectFailure(
    () =>
      db.query(`
        select public.review_deck_candidate(
          '${pendingCandidate.rows[0].id}',
          'approved',
          null,
          'pending validation must fail'
        )
      `),
    "pending code approval",
  );
  await db.exec("reset role");
  await db.exec("set role service_role");
  const draftCandidate = await db.query(`
    insert into public.deck_candidates (
      source_id, fingerprint, cluster_key, source_url,
      source_published_at, title, player_name, raw_deck_code, code_hash,
      patch_id, code_validation_status, code_validated_at,
      class_id, format, observed_count
    ) values (
      '${trackingSourceId}',
      repeat('3', 64),
      repeat('4', 64),
      'https://example.com/decks/curated',
      now() - interval '1 hour',
      '큐레이션 후보 덱',
      'Candidate Player',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('3', 64),
      '00000000-0000-4000-8000-000000000356',
      'valid',
      now(),
      11,
      'standard',
      1
    )
    returning id
  `);
  const draftCandidateId = draftCandidate.rows[0].id;
  await setUser(moderatorId);
  await db.query(`
    select public.review_deck_candidate(
      '${draftCandidateId}',
      'approved',
      null,
      'curated draft validation'
    )
  `);
  const curatedDraft = await db.query(`
    select *
    from public.create_deck_candidate_draft(
      '${draftCandidateId}',
      '후보 기반 큐레이션 초안',
      '원본 출처를 보존한 큐레이션 초안의 데이터베이스 흐름을 검증합니다.',
      '',
      'medium',
      '',
      '',
      '',
      '',
      'database-test',
      'warrior',
      7,
      '${rpcCards}'::jsonb
    )
  `);
  const curatedDraftId = curatedDraft.rows[0].deck_id;
  assertEqual(
    curatedDraft.rows[0].deck_status,
    "draft",
    "approved candidate creates curated draft",
  );
  const curatedState = await db.query(`
    select
      candidate.status as candidate_status,
      candidate.matched_deck_id,
      deck.author_id,
      deck.verification_status,
      evidence.source_url,
      evidence.evidence_status
    from public.deck_candidates candidate
    join public.decks deck on deck.id = candidate.matched_deck_id
    join public.source_evidence evidence on evidence.deck_id = deck.id
    where candidate.id = '${draftCandidateId}'
  `);
  assertEqual(
    curatedState.rows[0].candidate_status,
    "drafted",
    "candidate enters drafted state",
  );
  assertEqual(
    curatedState.rows[0].matched_deck_id,
    curatedDraftId,
    "candidate links to curated draft",
  );
  assertEqual(
    curatedState.rows[0].author_id,
    moderatorId,
    "moderator owns curated draft",
  );
  assertEqual(
    curatedState.rows[0].verification_status,
    "source_checked",
    "curated draft preserves source verification",
  );
  assertEqual(
    curatedState.rows[0].source_url,
    "https://example.com/decks/curated",
    "curated draft preserves original source URL",
  );
  await db.exec(`
    update public.decks
    set
      recommended_for = '큐레이션 덱을 찾는 사용자',
      game_plan = '초반에는 필드를 관리하고 중반부터 핵심 하수인으로 압박합니다.',
      mulligan_guide = '초반 비용 카드를 우선해서 찾습니다.'
    where id = '${curatedDraftId}';
  `);
  const curatedPublished = await db.query(`
    select * from public.publish_deck_draft('${curatedDraftId}')
  `);
  assertEqual(
    curatedPublished.rows[0].deck_status,
    "published",
    "curated draft publishes after guide completion",
  );
  const curatedCandidatePublished = await db.query(`
    select status, matched_deck_id
    from public.deck_candidates
    where id = '${draftCandidateId}'
  `);
  assertEqual(
    curatedCandidatePublished.rows[0].status,
    "linked",
    "published curated draft links candidate",
  );
  const reviewedCandidate = await db.query(`
    select status, matched_deck_id
    from public.review_deck_candidate(
      '${trackingCandidateId}',
      'linked',
      '${rpcPublishedId}',
      'database guardrail validation'
    )
  `);
  assertEqual(
    reviewedCandidate.rows[0].status,
    "linked",
    "moderator links reviewed candidate",
  );
  assertEqual(
    reviewedCandidate.rows[0].matched_deck_id,
    rpcPublishedId,
    "reviewed candidate target deck",
  );
  const linkedTrend = await db.query(`
    select trend_score, tracking_source_count
    from public.decks
    where id = '${rpcPublishedId}'
  `);
  assert(
    linkedTrend.rows[0].trend_score > 0,
    "linked candidate refreshes deck trend score",
  );
  assertEqual(
    linkedTrend.rows[0].tracking_source_count,
    1,
    "linked candidate refreshes source count",
  );
  await expectFailure(
    () =>
      db.query(`
        select public.review_deck_candidate(
          '${trackingCandidateId}',
          'rejected',
          null,
          'second review must fail'
        )
      `),
    "already reviewed candidate",
  );
  await db.exec("reset role");
  await db.exec("set role anon");
  await expectFailure(
    () =>
      db.query(
        `select count(*) from public.deck_candidates where id = '${trackingCandidateId}'`,
      ),
    "anonymous candidate queue read",
  );
  await setUser(ownerId);

  await db.exec("begin");
  const deckResult = await db.query(`
    insert into public.decks (
      slug, author_id, title, class_id, format, summary,
      recommended_for, game_plan, mulligan_guide
    ) values (
      'database-validation-deck',
      '${ownerId}',
      '데이터베이스 검증 덱',
      11,
      'standard',
      '데이터베이스 제약과 권한을 검증하기 위한 충분히 긴 설명입니다.',
      '테스트 사용자',
      '초반에는 필드를 잡고 중반부터 상대 영웅에게 피해를 누적합니다.',
      '1비용과 2비용 카드를 우선해서 찾습니다.'
    )
    returning id
  `);
  const deckId = deckResult.rows[0].id;

  const codeResult = await db.query(`
    insert into public.deck_codes (
      deck_id, raw_code, code_hash, version_number, patch_id, format,
      class_id, hero_dbf_id, card_count, parse_status, parser_version, created_by
    ) values (
      '${deckId}',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('a', 64),
      1,
      '00000000-0000-4000-8000-000000000356',
      'standard',
      11,
      7,
      30,
      'valid',
      'database-test',
      '${ownerId}'
    )
    returning id
  `);
  const codeId = codeResult.rows[0].id;

  const deckCardValues = Array.from({ length: 15 }, (_, index) => {
    const id = 1000 + index;
    return `(
      '${codeId}',
      (select id from public.cards where dbf_id = ${id}),
      2,
      ${index}
    )`;
  }).join(",\n");
  await db.exec(`
    insert into public.deck_cards (deck_code_id, card_id, quantity, sort_order)
    values ${deckCardValues};

    update public.decks
    set
      current_deck_code_id = '${codeId}',
      status = 'published',
      published_at = now()
    where id = '${deckId}';
    commit;
  `);

  await db.exec(`
    insert into public.deck_likes (user_id, deck_id)
    values ('${ownerId}', '${deckId}');
  `);
  const counted = await db.query(
    `select recommendation_count from public.decks where id = '${deckId}'`,
  );
  assertEqual(
    counted.rows[0].recommendation_count,
    1,
    "recommendation count trigger",
  );
  await db.exec(`
    insert into public.favorites (user_id, deck_id)
    values ('${ownerId}', '${deckId}');
  `);
  const favorited = await db.query(
    `select favorite_count from public.decks where id = '${deckId}'`,
  );
  assertEqual(favorited.rows[0].favorite_count, 1, "favorite count trigger");
  await db.exec(`
    delete from public.favorites
    where user_id = '${ownerId}' and deck_id = '${deckId}';
  `);
  const unfavorited = await db.query(
    `select favorite_count from public.decks where id = '${deckId}'`,
  );
  assertEqual(
    unfavorited.rows[0].favorite_count,
    0,
    "favorite removal count trigger",
  );
  const commentResult = await db.query(`
    insert into public.comments (deck_id, author_id, body)
    values ('${deckId}', '${ownerId}', '멀리건은 1비용 카드를 우선했습니다.')
    returning id
  `);
  const commentId = commentResult.rows[0].id;
  const commented = await db.query(
    `select comment_count from public.decks where id = '${deckId}'`,
  );
  assertEqual(commented.rows[0].comment_count, 1, "comment count trigger");

  await setUser(otherId);
  const reportResult = await db.query(`
    insert into public.reports (
      reporter_id, target_type, target_id, reason, details
    ) values (
      '${otherId}', 'comment', '${commentId}', 'false_claim', '허위 운영 정보로 보입니다.'
    )
    returning id
  `);
  const reportId = reportResult.rows[0].id;
  await expectFailure(
    () =>
      db.exec(`
        insert into public.reports (
          reporter_id, target_type, target_id, reason
        ) values (
          '${otherId}', 'comment', '${commentId}', 'spam'
        )
      `),
    "duplicate open report",
  );

  await setUser(moderatorId);
  const reportResolution = await db.query(`
    select * from public.resolve_content_report(
      '${reportId}',
      'hidden',
      '허위 정보 신고 확인'
    )
  `);
  assertEqual(
    reportResolution.rows[0].report_status,
    "resolved",
    "report hidden resolution status",
  );
  assertEqual(
    reportResolution.rows[0].target_status,
    "hidden",
    "comment hidden by report resolution",
  );
  const moderationState = await db.query(`
    select
      (select comment_count from public.decks where id = '${deckId}') as comments,
      (select count(*)::integer from public.moderation_audits
       where target_id = '${commentId}' and action = 'report_target_hidden') as audits
  `);
  assertEqual(moderationState.rows[0].comments, 0, "hidden comment count removed");
  assertEqual(moderationState.rows[0].audits, 1, "report moderation audit logged");

  await setUser(ownerId);

  await expectFailure(
    () =>
      db.exec(
        `update public.decks set recommendation_count = 99 where id = '${deckId}'`,
      ),
    "direct trusted counter update",
  );

  await db.exec("reset role");
  await db.exec("select set_config('request.jwt.claim.sub', '', false)");
  await db.exec("set role anon");
  const publicDeck = await db.query(
    `select count(*)::integer as count from public.decks where id = '${deckId}'`,
  );
  assertEqual(publicDeck.rows[0].count, 1, "anonymous published deck read");
  const rpcPublicDeck = await db.query(`
    select
      (select count(*)::integer from public.decks where id = '${rpcPublishedId}') as decks,
      (select count(*)::integer from public.source_evidence where deck_id = '${rpcPublishedId}') as evidence
  `);
  assertEqual(rpcPublicDeck.rows[0].decks, 1, "anonymous RPC deck read");
  assertEqual(rpcPublicDeck.rows[0].evidence, 1, "anonymous evidence read");
  const publicCatalog = await db.query(`
    select total_count, class_name, evidence_status, source_type
    from public.search_public_decks(
      p_class => '전사',
      p_evidence => 'source_linked',
      p_source => 'ranked',
      p_current_patch_only => true,
      p_sort => 'latest',
      p_limit => 10
    )
  `);
  assert(
    publicCatalog.rows.length >= 1,
    "anonymous public catalog returns published decks",
  );
  assertEqual(
    publicCatalog.rows[0].class_name,
    "전사",
    "public catalog class filter",
  );
  assertEqual(
    publicCatalog.rows[0].evidence_status,
    "source_linked",
    "public catalog evidence filter",
  );
  assertEqual(
    publicCatalog.rows[0].source_type,
    "ranked",
    "public catalog source filter",
  );
  const trendingCatalog = await db.query(`
    select deck_id, trend_score, tracking_source_count, last_tracked_at
    from public.search_public_decks(
      p_evidence => 'trusted',
      p_current_patch_only => true,
      p_sort => 'trending',
      p_limit => 24
    )
  `);
  assert(
    trendingCatalog.rows.some(
      (row) =>
        row.deck_id === rpcPublishedId &&
        row.trend_score > 0 &&
        row.tracking_source_count === 1 &&
        row.last_tracked_at !== null,
    ),
    "public catalog exposes reviewed trend evidence",
  );
  assert(
    trendingCatalog.rows.every(
      (row, index, rows) =>
        index === 0 || rows[index - 1].trend_score >= row.trend_score,
    ),
    "trending catalog orders by reviewed trend score",
  );

  await db.exec("reset role");
  await db.exec(`
    insert into public.decks (
      slug, author_id, title, class_id, format, summary
    ) values (
      'owner-private-draft',
      '${ownerId}',
      '작성자 비공개 초안',
      11,
      'standard',
      '다른 사용자가 읽을 수 없어야 하는 충분히 긴 비공개 초안 설명입니다.'
    );
  `);
  await setUser(otherId);
  const privateDraft = await db.query(`
    select count(*)::integer as count
    from public.decks
    where slug = 'owner-private-draft'
  `);
  assertEqual(privateDraft.rows[0].count, 0, "other user cannot read draft");
  const privateCatalogDeck = await db.query(`
    select count(*)::integer as count
    from public.search_public_decks(
      p_query => '작성자 비공개 초안',
      p_current_patch_only => false
    )
  `);
  assertEqual(
    privateCatalogDeck.rows[0].count,
    0,
    "public catalog excludes private drafts",
  );

  await db.exec("reset role");
  await expectFailure(
    () =>
      db.exec(`
        insert into public.source_evidence (
          deck_id, source_type, wins, evidence_status
        ) values (
          '${deckId}', 'community', 10, 'self_reported'
        )
      `),
    "wins and losses must be paired",
  );

  await db.exec("reset role");
  await expectFailure(
    () =>
      db.query(`
        select * from public.activate_hearthstone_patch(
          '35.6.2',
          '2026-06-08T00:00:00Z',
          'https://news.blizzard.com/en-us/article/999/35-6-2-patch-notes',
          false
        )
      `),
    "non-service patch activation",
  );
  await db.exec(`
    insert into public.deck_candidates (
      source_id, fingerprint, cluster_key, source_url, source_published_at,
      raw_deck_code, code_hash, patch_id, status,
      code_validation_status, code_validated_at, observed_count
    ) values (
      '${trackingSourceId}',
      repeat('9', 64),
      repeat('8', 64),
      'https://example.com/decks/stale-after-patch',
      '2026-06-07T00:00:00Z',
      'AAECAQcBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
      repeat('9', 64),
      '00000000-0000-4000-8000-000000000356',
      'ready_for_review',
      'valid',
      now(),
      1
    );
    select set_config('request.jwt.claim.role', 'service_role', false);
    set role service_role;
  `);
  const patchActivation = await db.query(`
    select * from public.activate_hearthstone_patch(
      '35.6.2',
      '2026-06-08T00:00:00Z',
      'https://news.blizzard.com/en-us/article/999/35-6-2-patch-notes',
      false
    )
  `);
  assertEqual(
    patchActivation.rows[0].previous_version,
    "35.6",
    "patch activation previous version",
  );
  assertEqual(
    patchActivation.rows[0].current_version,
    "35.6.2",
    "patch activation current version",
  );
  assert(
    patchActivation.rows[0].stale_candidate_count >= 1,
    "patch activation stales old active candidates",
  );
  await expectFailure(
    () =>
      db.query(`
        select * from public.activate_hearthstone_patch(
          '35.4.2',
          '2026-05-19T00:00:00Z',
          'https://news.blizzard.com/en-us/article/998/35-4-2-patch-notes',
          false
        )
      `),
    "patch downgrade",
  );
  await db.exec("reset role");
  const patchState = await db.query(`
    select
      (select version from public.patches where is_current) as current_version,
      (select count(*)::integer from public.deck_candidates
       where fingerprint = repeat('9', 64) and status = 'stale') as stale_candidates,
      (select count(*)::integer from public.patch_transitions) as transitions,
      (select trend_score from public.decks where id = '${rpcPublishedId}') as old_trend
  `);
  assertEqual(patchState.rows[0].current_version, "35.6.2", "current patch switched");
  assertEqual(patchState.rows[0].stale_candidates, 1, "old candidate marked stale");
  assertEqual(patchState.rows[0].transitions, 1, "patch transition audited");
  assertEqual(patchState.rows[0].old_trend, 0, "old patch trend signal cleared");
  await db.exec(`select set_config('request.jwt.claim.role', '', false);`);
}

async function setUser(userId) {
  await db.exec("reset role");
  await db.exec(
    `select set_config('request.jwt.claim.sub', '${userId}', false)`,
  );
  await db.exec("set role authenticated");
}

async function expectFailure(action, label) {
  let failed = false;
  try {
    await action();
  } catch {
    failed = true;
  }
  assert(failed, `${label} should fail`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Database assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(
      `Database assertion failed: ${message}; expected ${String(
        expected,
      )}, received ${String(actual)}`,
    );
  }
}
