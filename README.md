# HearthDeck Hub

HearthDeck Hub is a decision-oriented Hearthstone deck community prototype.
The product flow is:

`Discover -> Evaluate trust and fit -> Understand the guide -> Copy -> Play`

Product decisions and release scope are maintained in:

- [`docs/product/00-product-brief.md`](docs/product/00-product-brief.md)
- [`docs/product/01-mvp-scope.md`](docs/product/01-mvp-scope.md)
- [`docs/product/02-information-architecture.md`](docs/product/02-information-architecture.md)
- [`docs/product/03-data-model.md`](docs/product/03-data-model.md)
- [`docs/product/04-priorities-and-backlog.md`](docs/product/04-priorities-and-backlog.md)
- [`docs/product/PRD.md`](docs/product/PRD.md)
- [`docs/product/05-validation-plan.md`](docs/product/05-validation-plan.md)
- [`docs/product/06-operations-runbook.md`](docs/product/06-operations-runbook.md)
- [`docs/product/07-monetization-mvp-goal.md`](docs/product/07-monetization-mvp-goal.md)

## Current Status

The repository currently contains the public technical alpha:

- Responsive Home
- Goal and class discovery
- URL-based Deck List search, filters, and sorting
- Deck cards with patch and evidence labels
- Deck Detail with fit summary, guide, mulligan, card choices, and card list
- Desktop and mobile sticky deck-code copy
- Current and stale patch behavior
- Demo-data disclosure
- Unit/component tests
- Supabase PostgreSQL migrations, seed data, RLS policies, and pgTAP schema tests
- Immutable deck-code versions and trusted counter triggers
- HearthSim deckstring decoding, canonical hashing, and publication validation
- HearthstoneJSON Korean/English card-data adapter and safe sync dry run
- Supabase browser, request-scoped server, and service-role adapters
- Supabase-first card catalog with a cached HearthstoneJSON fallback
- Rate-limited deck-code preview API that does not log raw deck input
- Submission step 1 with sample input, validation, and Korean card preview
- PKCE-compatible email magic-link login and safe return paths
- Submission step 2 with structured guide validation
- Transactional owner-only draft creation and My Decks
- Submission step 3 with source classification and wins/losses-derived win rate
- Submission step 4 with explicit Save Draft and Publish actions
- Atomic publication of Deck, immutable code, cards, and source evidence
- Server-revalidated publication of an existing draft
- Supabase-backed public deck detail after publication
- Supabase-backed Home and Deck List discovery after publication
- Server-side public search, filters, sorting, counts, and stable pagination
- Source-type and trusted-evidence discovery filters
- Mobile full-screen filters and individually removable active filters
- Current patch labels sourced from Supabase reference data
- Source-registry and review-queue foundation for tracking recent decks
- Candidate deduplication, cross-source clustering, and freshness priority scores
- Reviewed candidate linkage to protected 14-day deck trend signals
- Public trending sort and explainable recent-source labels for reviewed signals
- Daily official Blizzard patch detection with reviewed, forward-only activation
- Atomic stale-candidate and trend-signal recalculation on patch transitions
- Public Atom feed adapter with bot, age, and canonical-code deduplication
- Full current-Standard card validation before candidates enter the review queue
- Moderator-only candidate queue with source review and exact-code deck matching
- Approved-candidate conversion into an editable moderator-owned deck draft
- Candidate source preservation and automatic trend linkage when that draft publishes
- Database-enforced review, rejection, relinking, and publication guardrails
- Non-blocking, privacy-preserving daily deck-copy counting
- Authenticated recommendation and favorite toggles on deck detail
- Owner-only saved-deck library with direct favorite removal
- Deck discussion with authenticated comments, author deletion, and reporting
- Moderator report queue with transactional target hiding and audit logging
- Moderator official-event import screen with dry-run validation before writes
- MVP product analytics events for discovery, detail, copy, and submission flow
- Moderator product analytics dashboard for the 7-day MVP funnel
- Moderator operations status dashboard for collection, moderation, patch, card, and analytics health
- Moderator content-readiness checklist for public beta launch criteria
- User-facing privacy notice and community rules
- Public beta operations runbook for collection, moderation, incidents, and release evidence
- Monetizable MVP positioning around Korean mobile deck decisions
- GitHub quality gates for lint, types, tests, migrations, build, and dependency audit
- Explicit demo fallback only when public Supabase configuration is absent

External error tracking, staging evidence, and user validation remain future
release stages defined in the PRD. The four-step
submission, public discovery, and recent-deck review flows use the real parser,
catalog, Auth session, RLS, evidence policy, and PostgreSQL transactions when
Supabase is configured.

Without Supabase configuration, Home and Deck List intentionally fall back to
clearly disclosed demo content for UX validation. Those demo claims, records,
and card names must not be treated as live Hearthstone data.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Open [http://localhost:3000/submit](http://localhost:3000/submit) to validate a
real Hearthstone deck code. Without Supabase environment variables, the preview
uses a one-hour cached HearthstoneJSON catalog.

Email login and draft persistence require the public Supabase variables in
`.env.local`, the migrations applied to the project, and a completed card sync.
The login flow returns users to the submission they started and restores the
validated code from browser session storage.

Publication never accepts a standalone win-rate percentage. It stores wins and
losses, derives the displayed rate, and marks evidence as `source_linked` only
when an original URL is present.

Successful public deck-code copies are recorded after the clipboard operation,
so analytics failure never blocks the user's primary action. Authenticated
copies deduplicate by user and deck per day. Anonymous copies use a daily HMAC
derived in the server route; raw network addresses are never stored. Configure
the server-only `COPY_EVENT_HASH_SECRET` to enable anonymous counting.

Product funnel events are recorded through `/api/analytics/events` for the MVP
flow: deck list viewed, deck detail viewed, deck code copied, submit started,
deck preview succeeded, and deck draft created. The event contract rejects raw
deck codes and stores only bounded metadata. Configure the server-only
`ANALYTICS_EVENT_HASH_SECRET` to group anonymous events by day without storing
raw network addresses; when omitted, `COPY_EVENT_HASH_SECRET` is used as a
fallback.

Moderators can view the current 7-day funnel at
[http://localhost:3000/admin/analytics](http://localhost:3000/admin/analytics).
The dashboard shows total events, unique actors, detail-to-copy conversion,
daily activity, and top copied decks so product decisions do not depend on raw
database inspection.

Moderators can check launch operations at
[http://localhost:3000/admin/operations](http://localhost:3000/admin/operations).
This page summarizes recent deck collection runs, stale active sources, report
backlog, candidate review pressure, card sync status, patch review needs, and
analytics event flow into `ok`, `warning`, or `critical` cards.

Moderators can check content readiness at
[http://localhost:3000/admin/content-readiness](http://localhost:3000/admin/content-readiness).
The checklist maps the PRD launch criteria to live counts: at least 30 current
patch decks, 8 represented classes, 10 trusted decks, 5 beginner-friendly decks,
and complete guides for current-patch published decks.

## Quality Gates

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
npm run db:validate
npm run cards:dry-run
npm run patch:check
```

`db:validate` applies every migration and the deterministic seed to a
PostgreSQL-compatible in-process engine, then verifies representative RLS and
constraint behavior. Full Supabase local testing additionally requires Docker:

```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:stop
```

To write HearthstoneJSON data to Supabase, review
`config/hearthstone-standard.json`, set the server-only variables from
`.env.example`, and run `npm run cards:sync`.

To stage recent deck candidates, adapt
`config/deck-candidates.example.json`, run `npm run decks:track:dry-run -- file`
first, then use `npm run decks:track -- file` with server-only Supabase
credentials. Collection is automatic-ready, but publication remains
moderator-reviewed at
[http://localhost:3000/admin/deck-candidates](http://localhost:3000/admin/deck-candidates).
An approved candidate can be converted into a moderator-owned draft with its
validated code and original source preserved. The moderator completes the guide
in My Decks, then publication links the candidate and refreshes its 14-day trend
signal atomically.

Reviewed trend signals are exposed through `/decks?sort=trending`. The public
catalog returns the protected trend score, independent source count, and latest
observation time, while deck cards show only the user-facing source-count
explanation rather than presenting the internal score as a win-rate claim.

The first live adapter reads the public `r/CompetitiveHS` Atom feed as a Tier 1
community signal:

```bash
npm run decks:feeds:dry-run
npm run decks:feeds
```

It never publishes directly. It ignores bot reposts, deduplicates canonical
codes, rejects stale entries, and validates current Standard legality against
HearthstoneJSON. GitHub Actions runs the write command every two hours after
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured as repository
secrets.

Official Blizzard tournament events use a stricter operator-manifest adapter:

```bash
npm run decks:event:dry-run -- config/official-event.example.json
npm run decks:event -- path/to/reviewed-event.json
```

The adapter verifies the event article against Blizzard's Hearthstone news API,
including its news ID, canonical URL, and `Esports` category. Blizzard's event
articles do not expose a structured deck-list feed, so submitted deck codes
remain explicitly marked as `operator_manifest`, not as Blizzard-verified
codes. Write mode requires every code to pass current-format card validation,
requires the event patch to exist in Supabase, and still sends every candidate
through moderator review before publication. Duplicate submission IDs are
rejected before import.

Moderators can run the same dry-run and write flow from
[http://localhost:3000/admin/official-events](http://localhost:3000/admin/official-events).
The screen keeps official article verification, candidate count, validation
warnings, and write results together so recent high-impact tournament decks can
enter the review queue without bypassing trust checks.

The daily patch monitor reads Blizzard's official Hearthstone news API:

```bash
npm run patch:check
```

A newly detected patch deliberately fails the scheduled check so the workflow
acts as an operational alert. Activation is a separate manual action:

```bash
npm run patch:activate
```

Activation is service-role only, forward-only, and atomic. It marks active
old-patch candidates stale, recalculates linked trend signals, and records a
`patch_transitions` audit row. Major and `.0` releases additionally require
`CARD_LEGALITY_REVIEWED=true` after reviewing
`config/hearthstone-standard.json`. Feed writes read the current patch from
Supabase instead of relying on the repository's fallback patch value.

## Structure

```text
src/app/                 Next.js routes
src/components/deck/     Deck presentation and copy behavior
src/components/auth/     Passwordless login UI
src/components/home/     Home discovery components
src/components/layout/   Shared shell
src/components/submit/   Deck submission steps
src/lib/decks.ts         Temporary technical-alpha data
src/lib/types.ts         Product domain types
src/server/cards/        HearthstoneJSON adapter and sync planning
src/server/decks/        Draft request contracts
src/server/deckstrings/  Decode, canonicalize, hash, validate, preview
src/server/deck-tracking/ Feed parsing, validation, scoring, persistence
src/server/repositories/ Supabase-first data access with safe fallbacks
supabase/migrations/     PostgreSQL schema, constraints, RLS, sync history
supabase/tests/          pgTAP schema and policy checks
```
