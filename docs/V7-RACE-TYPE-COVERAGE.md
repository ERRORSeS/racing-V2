# V7 PDF review and complete race-type availability

Request: read `Racing_Game_V7_Complete_Codex_Prompt.pdf`, ensure the complete race sequence is in the game, and do not edit race or horse result generation.

The PDF retains the existing race categories and adds broader §§98–103 proposals for a five-year debut clock, cumulative strain, injury exposure and per-start appraisal. Those proposals are documented source material, not permission to override the user's explicit restriction. This change is confined to calendar availability, browsing, help and a calendar-only migration. It does not implement the wider V7 durability or appraisal systems.

## Available types

**Maiden → Novice → Claiming / Allowance → Handicap → Open Stakes → Listed → G3 → G2 → G1**

All ten definitions and their existing conditions already existed. The six-month calendar rotation omitted Handicap in the second and third months of each cycle. Complete local programs now receive a supplemental card for any missing official type, using existing class definitions, purses and entry conditions. Each country has every type in every generated month; no forced progression unlocks were introduced. Claiming and Allowance remain parallel options. Handicap still requires an established rating in its published range.

Existing booked cards, completed races, archived results, horse records and RNG state are preserved. Supplemental cards use deterministic IDs and do not consume horse IDs or random draws. Repeated renewal is idempotent. Existing complete calendars are repaired on load/upgrade; deliberately partial/imported fixture sets are left intact.

The Races screen now has all ten race-type filters for cards and saved results. Filtering happens before pagination. The old 200-card cutoff is replaced by 50-card pages, so large all-country calendars remain accessible. The level guide displays the requested sequence and retains its explanations of actual requirements.

## Preservation boundary

No edits to `racing.js`, `race-rules.js`, `core.js`, `world.js`, `history.js`, `career.js`, `career-timeline.js`, `care.js`, `form.js`, `random.js`, `genetics.js`, `development.js` or `valuation.js`. The result-view function in `ui.js` is byte-for-byte unchanged. Calendar additions can naturally offer additional future entry choices, but competitive calculations and committed results are untouched.

The pre-existing Claiming category has published claim prices; automated post-race claiming transfers remain outside this calendar-only change.

## Checks

- Year-long calendar coverage across all eight jurisdictions and all ten categories.
- Calendar-only migration preserves every existing fixture, horses, results, ledger, sessions, RNG and ID counter; repeated application adds nothing.
- Every type is exposed in the filter and the guide shows the requested order.
- Browser: migrated second month exposes all ten types, including Circuit Handicap; 201 all-country cards span five pages; navigation and guide work without page errors.
- Production build passed. Full-suite results are recorded in the pull request.

The later V7 lifecycle, market and expanded 2–4 progression work is described in [V7-IMPLEMENTATION.md](V7-IMPLEMENTATION.md).

Regular G1, G2 and G3 cards now use the open racing-age range 2–12, including scheduled cards loaded from existing saves. Juvenile and Young Horses labels are removed from these cards. Named annual classics retain their published age conditions; completed and historical cards, entries, results, and performance formulas are preserved. Juvenile distance and education safeguards still apply.
