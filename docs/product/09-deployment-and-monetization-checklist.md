# Deployment and Monetization Checklist

This checklist is the beginner-friendly path from technical alpha to a public, ad-ready MVP. It intentionally separates **deploying the site**, **connecting live data**, **proving content quality**, and **applying for ads**.

## Phase 1: Deploy the Site on Vercel

Goal: make the app reachable on a stable HTTPS URL, even if it still shows disclosed demo content.

1. Import the GitHub repository into Vercel.
2. Use the Next.js preset.
3. Deploy `main` first, then merge release PRs when checks pass.
4. Set `NEXT_PUBLIC_SITE_URL` after the first stable URL is known.
   - Use the custom domain if available.
   - Otherwise use the production Vercel URL.
   - Do not include a trailing slash.
5. Redeploy after changing `NEXT_PUBLIC_SITE_URL`.
6. Confirm these URLs load:
   - `/`
   - `/decks`
   - `/meta`
   - `/about`
   - `/rules`
   - `/privacy`
   - `/sitemap.xml`
   - `/robots.txt`

Passing this phase means the site is visible, not that it is ready for ads.

## Phase 2: Connect Supabase

Goal: replace demo fallback content with real database-backed decks and auth.

Add these Vercel environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
COPY_EVENT_HASH_SECRET
ANALYTICS_EVENT_HASH_SECRET
APP_ENV=production
APP_RELEASE=<deployment-or-commit-id>
```

Rules:

- Never paste `SUPABASE_SERVICE_ROLE_KEY` into a `NEXT_PUBLIC_*` variable.
- Never commit real Supabase keys to the repository.
- Keep `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` available to Production and Preview only when needed.
- Use long random strings for hashing secrets.

After variables are set:

1. Apply database migrations to the Supabase project.
2. Run card sync for the current Standard card catalog.
3. Create or confirm an admin/moderator account.
4. Redeploy Vercel.
5. Confirm the demo fallback message is gone in production.

## Phase 3: Prepare Launch Content

Goal: make the site useful enough that an ad reviewer or new visitor sees real value.

Use [`08-launch-content-playbook.md`](08-launch-content-playbook.md) and [`templates/launch-decks.csv`](templates/launch-decks.csv).

Minimum launch content:

- 30 current-patch published decks
- 8 represented classes
- 10 source-linked or trusted decks
- 5 beginner-friendly or low-dust decks
- complete guide sections for highlighted decks

Do not count a deck as launch-ready if it only has a code and title. It needs enough context for a player to decide whether to copy it.

## Phase 4: Validate the Mobile Core Loop

Goal: prove the site does the one thing it promises.

Test on a real phone, not only desktop responsive mode:

1. Open the production URL.
2. Choose a goal from the home page.
3. Open a deck detail page.
4. Read the summary, source label, game plan, and mulligan.
5. Copy the deck code.
6. Confirm the copy action succeeds without login.
7. Return to the list and try filters/search.
8. Open `/meta`, `/about`, `/rules`, and `/privacy` from navigation/footer.

Pass condition:

- first deck-code copy takes under 90 seconds for a new visitor;
- no ad, modal, login wall, or layout issue blocks copy;
- source and patch labels are understandable.

## Phase 5: Check Analytics and Operations

Goal: confirm the product can learn from traffic and detect basic issues.

Verify:

- `/api/analytics/events` accepts valid bounded product events;
- deck list view, deck detail view, deck copy, and submit start events appear;
- anonymous events do not store raw IP addresses;
- deck copy failure does not block clipboard success;
- `/admin/analytics` shows the 7-day funnel;
- `/admin/operations` does not show critical launch blockers;
- `/admin/content-readiness` matches the 30-deck threshold.

Capture screenshots for launch evidence.

## Phase 6: Prepare Search and Ad Review

Goal: avoid applying for ads before the site looks thin or unfinished.

Before applying:

- `NEXT_PUBLIC_SITE_URL` points to the final production URL;
- `/sitemap.xml` contains public pages;
- `/robots.txt` allows public pages and blocks admin/private routes;
- `/about`, `/rules`, and `/privacy` are reachable from the footer;
- demo fallback is not shown on production;
- at least 30 real deck pages are published;
- no unsupported win-rate claims appear on public pages;
- no copyrighted long-form guide text has been copied from other sites;
- contact path and ownership wording are accurate;
- mobile copy flow still works.

Recommended order:

1. Deploy and connect data.
2. Publish real content.
3. Verify analytics and operations.
4. Submit sitemap to search tools if desired.
5. Wait for initial indexing and usage signals.
6. Apply for advertising.

## Phase 7: Advertising Guardrails

Goal: monetize without damaging the core utility.

Rules for the first ad placement experiment:

- Do not put ads above the deck-code copy button on mobile.
- Do not use interstitials before copy.
- Do not hide source labels or patch labels below ads.
- Prefer low-density placements between content sections.
- Measure copy conversion before and after adding ads.
- Remove or move ads if copy conversion drops materially.

Advertising should be added only after the site is useful without it. The first revenue goal is repeat utility, not maximum ad density.

## Launch Decision

The site is ready for a public monetization attempt only when all are true:

- production URL is stable;
- Supabase-backed content is live;
- content-readiness criteria pass;
- mobile copy flow passes;
- privacy/rules/about pages are public;
- analytics and operations dashboards show healthy data;
- no high-risk legal, privacy, or source-credit issues remain.

If any item fails, keep the site in public beta or content-prep mode and do not apply for ads yet.
