# Product Direction Reset: Deck First, Community Second

Status: active product direction  
Owner: Product / UX / Engineering  
Updated: 2026-06-10

## Product promise

HearthDeck Hub is not a decorative landing page or a broad statistics product. A user opening the homepage should immediately see useful current-patch decks, understand whose deck each one is, and copy a code with minimal friction.

The second product pillar is a general Hearthstone community where users can talk freely without forcing every conversation into a deck comment thread.

## Homepage hierarchy

The first viewport must contain:

1. current patch and format
2. compact deck feed
3. deck owner or source identity
4. source type and trust level
5. total copies and recent copy momentum
6. one-click copy action
7. direct entry points for current, tournament, community, popular, and recent decks

Long marketing explanations, repeated recommendation grids, and decorative sections must not push the deck feed below the first viewport.

## Deck identity

Every published deck must clearly answer:

- Who used or submitted this deck?
- Is the person a tournament player, ranked player, creator, or community member?
- Where did the deck originate?
- Is the source official, linked, operator-verified, or self-reported?
- Which patch and format does it belong to?
- How many times has the code been copied?
- How many copies occurred recently?

Famous-player decks and ordinary-user decks may appear in the same feed, but their provenance must never be presented as equivalent.

## Community decks

Any authenticated user should be able to submit a valid deck code with a short title and optional play notes. The system validates format, card count, class, and current-patch legality before publication.

Community decks start with a self-reported label. They may earn more visibility through recent copies, recommendations, discussion quality, and later source verification. Popularity must not silently convert self-reported evidence into verified evidence.

## Copy metrics

Use copy activity as the primary behavioral signal instead of page views.

Show:

- lifetime copy count
- recent seven-day copy count or momentum label
- first published and last verified dates where useful

Ranking must balance recent momentum with source trust and freshness so old high-volume decks do not permanently dominate discovery.

## General board

Provide a separate general community board for Hearthstone discussion, questions, tournament reactions, patch talk, and casual conversation.

The board MVP requires:

- authenticated post creation and editing
- title, body, author, created time, and view count
- comments
- basic recommendation
- report and moderator hide actions
- recent and popular sorting

Deck comments remain attached to individual decks. The general board is not a replacement for deck-specific discussion.

## Tournament deck speed

The system should automatically discover and ingest publicly released official tournament decks. Human operators handle exceptions, not routine entry.

Target service levels after an official structured source becomes public:

- source change detected within 10 minutes during a watched event
- candidates parsed and validated within 15 minutes
- fully valid official-source decks published within 30 minutes
- ambiguous, image-only, or invalid decks sent to an exception queue

The tracker must record player, event, patch, format, source URL, submission identity, and deck code provenance. No source means no official badge.

## Product guardrails

- Do not prioritize decorative game imagery over scan speed.
- Do not require a user to open detail pages merely to identify the player, source, patch, or copy popularity.
- Do not rank by unverified win-rate claims.
- Do not auto-publish scraped decks without source and legality checks.
- Do not make community users second-class contributors; distinguish evidence rather than hiding their decks.
- Do not open public beta based only on code completion. Use real-user and operational evidence.

## Immediate implementation order

1. Replace the marketing-heavy homepage with a compact copy-first deck feed.
2. Surface player identity, source tier, lifetime copies, and recent copy momentum.
3. Simplify community deck submission and publication.
4. Add the general board MVP.
5. Add watched-event discovery and structured tournament source adapters.
6. Validate the combined flow with staging and five Hearthstone users.
