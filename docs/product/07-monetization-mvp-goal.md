# Monetizable MVP Goal

## Goal

Build HearthDeck Hub into a Korean, mobile-first Hearthstone deck decision hub that can earn advertising revenue once it has enough useful content and repeat traffic.

The site should not try to out-scale large data products on day one. Its first monetizable advantage is helping a player answer one question quickly:

> What deck should I play today, and can I copy it with confidence?

## Positioning

HearthDeck Hub combines three signals:

1. **Decision fit** - climbing, low dust, beginner-friendly, safe meta pick, or fun deck.
2. **Trust context** - current patch, source evidence, copy activity, recommendations, comments, and freshness.
3. **Playable guidance** - deck code, mulligan, game plan, weaknesses, and card-choice notes.

This creates a practical middle lane between pure data dashboards and loose community posts.

## MVP Promise

A first-time visitor should understand the product within five seconds:

- choose a goal;
- compare a short list of decks;
- open one deck;
- understand why it fits;
- copy the deck code on mobile without friction.

## Revenue Readiness Criteria

Before applying for advertising, the public site should have:

- at least 30 current-patch decks;
- at least 8 represented classes;
- at least 10 decks with trusted source evidence;
- at least 5 beginner-friendly or low-dust decks;
- complete guide sections for each highlighted deck;
- privacy policy, community rules, and contact path;
- stable production deployment on Vercel;
- Supabase-backed content rather than undisclosed demo data;
- product analytics for list views, detail views, copies, and submissions.

## Product Principles

- **Do not fabricate win-rate authority.** Show win rates only when the source and method are clear.
- **Prefer useful interpretation over raw numbers.** Explain what a deck is good for and when not to pick it.
- **Make copying the deck the primary action.** Advertising revenue depends on repeat utility, not just page views.
- **Treat mobile as the main surface.** Players often browse while the game is open elsewhere.
- **Let the site's own data compound.** Copy counts, recommendations, favorites, comments, and trend signals become the first proprietary dataset.

## Next Build Milestones

1. Make the home page goal-led: today recommendation, fast climb, low dust, beginner-friendly.
2. Ensure deck cards expose the most important decision signals above the fold.
3. Add or polish a meta summary surface that explains the current patch in plain Korean.
4. Connect Supabase and replace demo data with curated launch content.
5. Seed 30 launch decks with complete guides and evidence labels.
6. Validate the mobile flow from discovery to detail to copy.
7. Add advertising only after the site has enough content depth to avoid looking thin.
