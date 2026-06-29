# Launch Content Playbook

This playbook turns the monetizable MVP goal into a concrete content-production checklist. It is intentionally strict: HearthDeck Hub should not look like a thin ad site, and it should not fabricate Hearthstone performance claims just to fill pages.

## Launch Content Target

Before applying for advertising or promoting the production site widely, prepare at least:

- **30 current-patch published decks**
- **8 represented classes**
- **10 decks with trusted or source-linked evidence**
- **5 beginner-friendly or low-dust decks**
- **All highlighted decks with complete guide sections**

A deck only counts toward launch readiness when it has enough information for a visitor to decide whether to copy it.

## Content Quality Bar

Each launch deck should answer these questions:

1. **Why play this deck today?**
2. **Who is this deck for?** Beginner, budget, fast climb, safe meta pick, fun, or experienced pilot.
3. **What is the win plan?** One or two short paragraphs.
4. **What should I mulligan for?** At least three priority keeps and one matchup note if known.
5. **What are the weak spots?** Bad matchups, hard decisions, or common mistakes.
6. **Can I trust the claim?** Source URL, user-submitted record, official-event manifest, or clearly marked editorial judgment.
7. **Can I copy it quickly on mobile?** Deck code must be valid and current-format checked before publication.

## Required Fields Per Deck

Use this as the source checklist before creating or publishing a deck.

| Field | Required | Notes |
| --- | --- | --- |
| Title | Yes | Korean-friendly name, avoid unsupported rank/win-rate claims. |
| Class | Yes | Must match supported Hearthstone class labels. |
| Archetype | Yes | Example: Aggro, Control, Combo, Midrange, Tempo. |
| Deck code | Yes | Validate through the app before publish. |
| Patch | Yes | Must match the active current patch or be labeled stale. |
| Summary | Yes | One short decision-focused summary. |
| Tags | Yes | Include at least one decision tag such as `초보 추천`, `저가루`, `빠른 등반`, `메타 안전픽`, or `재미 덱`. |
| Featured reason | Highlighted only | Explain why this deck appears on the home page. |
| Dust estimate | Recommended | Needed for budget/low-dust decisions. |
| Difficulty | Recommended | Easy, medium, hard, or short Korean equivalent. |
| Source type | Yes | User record, community post, streamer, official event manifest, editorial review, etc. |
| Source URL | If available | Required for source-linked or trusted claims. |
| Wins/losses | If claiming record | Do not store standalone win-rate percentages without wins/losses. |
| Game plan | Yes | What the deck is trying to do. |
| Mulligan guide | Yes | Priority keeps and conditional keeps. |
| Strengths | Yes | Why this deck is worth considering. |
| Weaknesses | Yes | When not to pick it. |
| Card choices | Recommended | Explain flexible slots or expensive cards. |
| Last reviewed date | Yes | Content can go stale after patches. |
| Reviewer | Internal | Moderator or contributor who checked the deck. |

## 30-Deck Coverage Plan

The exact meta changes by patch, so do not hard-code class rankings here. Use this coverage plan as a production target:

| Bucket | Target count | Purpose |
| --- | ---: | --- |
| Safe meta candidates | 8 | Main acquisition content for players asking what is strong. |
| Fast climb decks | 6 | High utility for repeat visits and mobile copy behavior. |
| Beginner-friendly decks | 5 | Helps new/returning players and improves guide depth. |
| Low-dust decks | 5 | Makes the site useful even without full collections. |
| Fun or notable decks | 4 | Keeps the site from feeling purely utilitarian. |
| Official/tournament/event candidates | 2 | Adds trust and high-interest reference content. |

The same deck can carry multiple tags, but the launch set should still feel diverse. Avoid filling the site with ten variants of one archetype unless the patch truly demands it and the differences are explained.

## Spreadsheet Columns

If preparing content outside the app first, use [`templates/launch-decks.csv`](templates/launch-decks.csv). It contains 30 candidate rows with these columns:

```text
status,class,archetype,title,deck_code,patch,tags,summary,featured_reason,dust_estimate,difficulty,source_type,source_url,wins,losses,game_plan,mulligan,strengths,weaknesses,card_choices,last_reviewed,reviewer,notes
```

Recommended status values:

- `candidate`
- `validated_code`
- `guide_draft`
- `source_checked`
- `ready_to_publish`
- `published`
- `needs_update`

## Review Workflow

1. Collect candidate deck code and source.
2. Validate the deck code in `/submit`.
3. Confirm the deck is legal for the current Standard format.
4. Assign decision tags and difficulty.
5. Write the game plan, mulligan, strengths, and weaknesses.
6. Add source URL or clearly mark the claim as editorial/user-submitted.
7. Review on mobile: list card, detail page, sticky copy action.
8. Publish only after the guide is complete enough to help a first-time visitor.
9. After publishing, check whether the deck appears in the intended list/filter.
10. Re-review after every major patch.

## Ad-Readiness Rules

- Do not place ads until the public site has enough real deck pages to stand on its own.
- Do not let ads cover or delay the deck-code copy action.
- Do not create pages whose only purpose is search traffic; every page should help a player decide or learn.
- Keep privacy, rules, about/contact, and source standards discoverable from the footer.
- Preserve a screenshot or admin checklist evidence when the 30-deck threshold is reached.

## First Manual Batch

For the first real production batch, prioritize:

1. five decks a beginner can understand;
2. five decks with low crafting burden;
3. five decks that are likely to remain relevant across a minor patch;
4. five decks with clear community or event sources;
5. ten additional current-patch decks that fill class coverage gaps.

This avoids launching with only high-rank meta decks and makes the site more useful for the broader Korean audience needed for early traffic.
