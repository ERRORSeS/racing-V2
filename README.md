# First Light — Thoroughbred Stable Manager

Standalone browser-based Thoroughbred ownership, racing and breeding management. Native ES modules, no npm runtime dependencies. All data stays in the player's browser; this application does not share OXO code or save keys.

## Run

Requires Node 20+ and Python 3.

```sh
npm run dev      # http://localhost:5173
npm test         # engine, migration and server-rendered view regressions
npm run test:long # seeded ten-year simulation, compression and reload check
npm run build    # static deployment files in dist/
```

## Start and play

New Career presents **five ready prospects**, with three selected by default. Choose any three, another number, or add more. Names, IDs, skills, coat, personality and parents are fixed before selection and copied into the career without rerolling. Optional customization is under each horse's card. Explicit Regenerate uses the selected country/seed to prepare another catalog. Changing home country alone keeps the chosen horses' birth identities. The stable starts in the chosen home country with selected horses located there.

Existing careers upgrade automatically. Use Settings to change home jurisdiction, edit exact funds, choose official or fictional alternative registration, configure automation and export backups. Starting another career exports the current one before replacing it. There is no real-time waiting or currency purchase.

## Connected systems in v0.2

- **Dashboard:** stable journal first, clear feed without deleting permanent histories, archive, stable totals.
- **Horses:** searchable/paginated roster, descriptions, traits, current/potential, chronological/official age, `starts(wins-seconds-thirds)`, lifetime winnings, linked parent/ancestor careers, siblings, offspring, COI, medical and ownership history.
- **Market:** private purchases, auctions, reserve/bidding/finite NPC budgets, listings, disclosed medical history, pre-purchase exams, ownership transfers and actual sale records.
- **Races:** original international calendars, maiden/allowance/open/Grade or Group fixtures, eligibility, jockey bookings, tactics, travel, multiple player entries, shared-clock simulation, splits, finish interpolation, results, payouts, leaderboards and read-only highlight playback.
- **Vet / Farrier / Care:** five medical tiers, gradual soundness recovery, rehabilitation, clearance, welfare scratches, chronic retirement, rare opt-in fatality, hoof cycles, shoes, feed/turnout compatibility, monthly persisted moods and freely available gear.
- **Training:** persistent per-horse balanced programs processed on **every Next Day** as well as longer skips. Today's screen shows completed work, skill gain, fatigue, scheduled rest and pause reasons. A separate action runs today's eligible programs, idempotently. Six skill rotation, diminishing returns, potential caps, mood and staff effects; manual sessions and appropriate youngstock/light work.
- **Stud / Breeding:** retired breeding animals, maturity and medical gates, natural service, conception, gestation, foaling, inherited pigment/gray/creative tobiano and polygenic aptitude, parent/offspring links and post-foaling rest.
- **Registries:** official vs alternative eligibility, one lifetime voluntary four-score inspection, boundary-safe Fail/Pass/Golden/Elite titles and appraisal effects.
- **Breeders:** production and actual progeny results, available stock; NPC training, racing, budgets, sales, retirement, breeding and new cohorts during skips.
- **Freezer:** collection, doses, viability, transfer/shipment and disposal; frozen AI consumes a dose only in the fictional alternative registry. It cannot register official racing TBs.
- **Settings / Calendar:** home country, exact integer-cent finances, staff, operating costs, separate auto-race toggle (default off), dark/light themes, calendar and backups.

## Saves and reproducibility

Schema 1 migrates additively to schema 2, preserving existing IDs, records and funds. IndexedDB replaces small localStorage snapshots; the original key is read for migration and kept intact. Current and previous snapshots are gzip-compressed when supported. Exports remain checksummed JSON. Imports validate supported schemas, relationships, careers, fixtures, medical references, enums and unsupported markup before replacing the current career. Unknown versions and corrupt data never silently reset a career.

All random world mutations use stored seeded RNG. Views and replays do not draw random numbers. Simulation entity IDs do not depend on the number of journal messages or time-advance clicks. Long time advances run in a Web Worker; saving/compression follows before the UI accepts another mutation.

## Architecture

| Module | Responsibility |
| --- | --- |
| `src/rules.js` | Rules, countries, exact money, calendar and age |
| `src/random.js`, `src/core.js` | Stored RNG, names, identities, events, funds and ownership helpers |
| `src/starters.js` | Fixed ready-prospect catalog with persistent ancestry |
| `src/world.js`, `src/time-worker.js` | World initialization, daily orchestration, staff, NPC lifecycle and worker |
| `src/career.js` | Canonical career totals, descriptions, relatives and relationship-matrix COI |
| `src/care.js` | Care, mood, medical, farrier, training, restrictions and exposure |
| `src/racing.js` | Fixtures, entries, jockeys, shared-clock races, immutable results and payouts |
| `src/market.js` | Appraisals, private sales, auctions and settlement |
| `src/breeding.js`, `src/registry.js` | Reproduction, inheritance, freezer and inspection |
| `src/upgrade.js`, `src/storage.js` | Migration, validation, compression and browser persistence |
| `src/app.js`, `src/ui.js`, `src/style.css` | Action dispatch, read-only views and responsive interface |

## Validation and current limits

23 tests cover starter identity/selection, daily training, money, country changes, journal clearing, race idempotency, multiple entries, medical recovery, auctions, inheritance, COI, inspection boundaries, schema migration, compression and rendering all required routes. Includes 10,000 chestnut pairings and 1,000 seeded comparative races with both expected strength and upsets.

A seeded ten-year regression completed at day 3600 with 1,078 horses, 3,957 committed races, 179 foals, eight sales and 438,962 training sessions; the 170.7 MB JSON compressed to 21.9 MB and reloaded with relationships/results preserved. The run took 55.2 seconds on this executor, including serialization/compression/reload. This is a measured desktop-scale result, not a guarantee for every browser or a 100-year benchmark.

**Browser interaction QA remains unverified:** this managed environment lacks the required `cua_repl.js` tool. Engine and HTML rendering tests do not substitute for click-through browser testing.

This is a connected implementation across all twelve requested destinations, **not a claim that every detail of the master specification is finished**. Genetics currently models Extension, Agouti, gray and creative tobiano, not the complete KIT/dilution/pattern suite. Jockey skills, class rules, equipment variants, global analytics, negotiation, NPC finances and medical knowledge use compact game abstractions. Individual notifications/read states, exhaustive tack legality, richer monthly summaries and full world-history pagination remain further work. Large histories are preserved and compressed rather than deleted; very long careers may still require additional storage/performance work. Legacy unknown ancestor racing histories stay unrecorded; invented historical wins are never added.
