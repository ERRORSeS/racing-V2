# V9 gameplay and performance update

V9 modifies the existing engine. Existing horse IDs, pedigrees, genes, financial records and completed race results remain in place. Migration adds the naming preference, campaign records and a V9 marker without changing the schema-7 save namespace. Older partitioned and portable saves remain readable.

## Race simulation and official margins

- Future race speed responds more strongly to actual speed ability within the existing segment engine. Acceleration, energy use, pace, positioning, surface/distance suitability, condition, fatigue, mood, temperament, jockey, traits and persistent individual form still participate. Large defeats result from actual simulated time gaps, not a multiplier on displayed margins.
- New results store their conversion and simulation version. UK/Ireland/France good turf uses 5.5 lengths/second, soft ground 5, synthetic 6; USA dirt uses 6. Other flat circuits use 5.5 or 5 on soft ground. These are explicitly modeled jurisdiction approximations.
- A 0.20-second gap at 5.5 lengths/second is 1.10 lengths; 2.40 seconds is 13.20 lengths. Close finishes have nose, short-head, head, neck and fractional-length labels.
- Finish times within 0.005 seconds share a placing. Tied runners divide the purse shares for their occupied positions, including cent remainders. Raw times remain available. Timeline validation understands tied prizes.
- Official rows supply career margins, replay selectors, news and profiles. Checkpoint frames do not duplicate final margins; replay displays read the canonical row without modifying the archive. Performance figures continue to derive from actual time. Completed older races retain their recorded conversion and results.
- New horses inherit part of their parental consistency tendency while retaining individual variation. Existing reliability profiles are preserved.

## NPC campaigns and fields

NPCs persist debut, career/annual starts, annual targets, last/next race dates, intended fixtures, individual recovery and campaign state. Typical targets are 1–3 starts at two (including some unraced horses and occasional precocious 4–5-start horses), 3–6 at three and 4–7 for adults. Exceptional additional starts require a substantial break. Normal spacing is 14–42 days, influenced by distance, intensity, recovery, soundness and cumulative strain. All countries count toward the same career and year.

The actual planner enforces preparation, veterinary restrictions, travel, booked-race spacing, distance suitability, poor-form freshening and the existing five-year debut window. Stakes-proven horses target stakes rather than farming low-level races. Graded NPCs need prior starts and suitable ability. Juvenile Group/Grade entries also need actual prior top-three evidence.

Campaign states cover unstarted, initial training, conditioning, trials/qualification, active racing, post-race recovery, freshening, veterinary break, rehabilitation and retirement. Active NPC campaigns normally have two work days per week, conditioning three; post-race and freshening periods rest. Player daily auto-training is unchanged.

Upcoming nominations recruit prepared local cohorts from multiple stables when necessary. Proven recruits receive three actual shared historical fixtures, with valid ages, finish rows and linked careers; their records are not invented win counters. Recruitment is bounded per fixture. Restricted championship points still require the appropriate real qualifying events. Regular fields retain the rider-replenishment and eligible-reserve mechanisms. A genuinely restricted event can still be deferred if no legally qualified field exists.

New novice and allowance cards admit ages 2–4 over appropriate young-horse distances. Maiden/juvenile routes, open-age graded races, four regular meetings and monthly renewal remain. Existing published cards and completed records are retained.

## Soundness before debut

Routine training and calendar age do not consume an unraced horse’s racing-years reserve. The five-year clock starts with the first official start. Pre-racing workload/clinical strain is recorded separately, stays available for physical injury risk and is not charged as racing-career wear. Training injuries still affect physical health, rehabilitation and clearance. New migration restores mistakenly depleted never-raced reserves, preserves their prior strain as pre-racing evidence and adds an audit record. It leaves raced horses’ reserves and all completed results untouched.

`test/pre-debut-soundness.test.js` checks 90 days of real training, the transition at an actual debut, training injuries, late debutants and repeatable save migration. Source changes are in `src/racing-years.js`, `src/durability.js`, `src/injury-risk.js`, `src/care.js`, `src/v7-ui.js`, `src/upgrade.js`, `src/storage.js` and the daily advancement guard in `src/world.js`.

## Naming and auctions

The default Long OXO generator composes names from vocabulary pools and multiple grammatical templates. Short / Classic, Extra Long / Poetic and Official Registry Naming are available in Settings. Manual creative names allow 120 characters; official naming uses an 18-character registry-style limit. All existing full names and permanent IDs remain unchanged. Text wraps on mobile. Prepared starter selection preserves the exact existing genotype phase and identity.

Closed auction events disappear from the active catalog. Bids, purchase records and ownership remain permanent. Recent closed catalogs are available in a separate collapsed sale archive, with lots loaded only when opened; they do not stack among active events.

## Persistence and responsiveness

The earlier worker, FIFO skip queue, revision checks, bounded partitions and targeted action saves remain. V9 adds:

- Historical race processing avoids live reservation scans.
- Already-upgraded worlds avoid repeated whole-world migration work on every skip.
- Daily loops avoid archive horses, and monthly owner/booking/produce queries reuse indexes.
- Worker horse patches omit unchanged genetic and other immutable data; full and partial patches reconstruct the same world.
- Every newly recorded compact NPC training session is retained as a packed per-horse history record. Profiles decode the selected horse’s recent history on demand. Player and debug training records remain fully expanded. This reduces nested-object memory without discarding training evidence.
- Transient action-autosave failures retry with bounded backoff; revision conflicts remain protected. Unsaved edits stay in memory, and “Saved” requires a successful commit.
- A direct +7-day button joins +1 and +30. Navigation remains available while simulation and saving run; completion is never reported early.

## Files changed

| System | Files |
| --- | --- |
| Race timing, margins, reliability, reports | `src/racing.js`, `src/race-margins.js`, `src/form.js`, `src/career-timeline.js`, `src/media.js` |
| NPC schedules, preparation, population, calendar, daily/monthly work | `src/npc-campaign.js`, `src/circuit-reserves.js`, `src/race-catalog.js`, `src/world.js`, `src/reservations.js`, `src/stud.js`, `src/care.js` |
| Names and preserved starter identity | `src/naming.js`, `src/random.js`, `src/core.js`, `src/world.js` |
| Auctions, profiles, mobile display, week skip | `src/auction-ui.js`, `src/ui.js`, `src/app.js`, `src/style.css` |
| Save migration, retries, compact training archives, partial horse patches | `src/upgrade.js`, `src/storage.js`, `src/save-queue.js`, `src/training-history.js`, `src/world-patch.js`, `src/snapshot-parts.js` |
| Guide and release metadata | `src/v9-guide.js`, `src/guide.js`, `package.json`, `.github/workflows/pages.yml`, this document |
| New checks | `test/v9-gameplay.test.js`, `test/pre-debut-soundness.test.js`, `scripts/check-v9-browser.cjs`, `scripts/check-v9-performance.mjs` |
| Updated regressions | `test/calendar-continuity.test.js`, `test/fast-fields.test.js`, `test/new-management.test.js`, `test/systems.test.js`, `test/v3.test.js`, `test/v5.test.js`, `test/v6-release.test.js`, `test/v7-systems.test.js`, `test/world.test.js` |

Existing regression fixtures were updated where V9 intentionally changes their assumptions: dead heats can have multiple winners, names may exceed 18 characters, novices/allowances can reuse an existing appropriate card instead of adding a duplicate, juvenile graded horses require prior evidence, and recruitment produces real historical records even when the optional broad prehistory setting is zero. Isolated engine tests keep their required completed-race evidence instead of deleting it.

## Requested test coverage

| V9 requirements | Checks |
| --- | --- |
| 1–4: conversions, terminology, replay/result agreement | V9 conversion, photo-finish, segment-spread and canonical replay/career tests |
| 5, 22: permanent historical results | V9 export/import and additive-migration tests; browser archive comparison after skips/reload |
| 6–8: 10,000 names, mobile display, stable IDs | V9 randomized-name and long-identity tests; 390px browser full-name check |
| 9–12: annual campaigns, dense calendars, rollover | V9 individual-plan and 100-horse juvenile/adult annual stress samples with a suitable race offered every day |
| 13–15: elite fields, regular fields, ineligibility | V9 actual recruitment/graded/ordinary-field tests, medical/starting/window checks; existing fast-field, race-level and V7 tests |
| 16–21: responsive skips/saving, FIFO, reload, large worlds | V9 browser, click-performance, V6 browser, population benchmark, save-retry, partial-patch and bounded-snapshot tests |
| 23: pregnancy, births, aging | Existing 30-test V8 reproductive suite, ten-year reproduction test, V8 browser workflow and rapid-skip regression tests |
| 24: fatigue recovery | V9 month-rest test and existing V6 fatigue/workload tests |
| 25: V1–V8 preservation | Complete engine regression suite, migration fixtures, breeding/import browsers and static build |

CI runs the complete suite serially with a 4 GiB Node heap budget. Large legacy round-trip tests temporarily hold multiple complete worlds; the deployed save path continues to use bounded partitions. This is a test resource setting, not a change to browser gameplay or a skipped check.

## Verification results

- Full engine regression run: **190 passed, 0 failed** (`NODE_OPTIONS=--max-old-space-size=4096 node --test --test-concurrency=1`).
- Additional focused V6/V7, partitioned-save and pre-debut checks: 33 passed; final race/photofinish checks: 5 passed.
- V9 browser: 390px full-name wrapping, active/archived auction navigation, +30 days and queued +1/+1, save/reload, permanent archived results and restoration of an old never-raced reserve all passed without page errors. Saved day was 32; debut remained null.
- V8 browser: owned and NPC stud covering, scan/confirmation and reload passed.
- Import browser: legacy JSON, portable backup, unusual extensions, invalid-file protection and load-error recovery passed.
- Click browser: training-policy action and delta autosave survived reload; action handler measured roughly 33 ms during concurrent regression work.
- Static build and `git diff --check` passed.

## Measurements and limits

A local raw-simulation population benchmark processed seven days in approximately 1.6–1.9 seconds with starting populations of 3,697, 8,395 and 15,319 horses (145, 188 and 284 MiB heap after those stages). These measurements exclude durable writes and rendering. Browser navigation during a month skip took roughly 3–5 ms in the tested mobile viewport; names, archives and saved day 32 survived reload without page errors. The final migration/reload browser check had 8,978 horses and completed its month in approximately 14.3 seconds including saving while regression work was also running. Navigation took 4.3 ms, and the restored pre-debut reserve remained unchanged with no debut date.

**A universal one-second month skip is not achieved.** More realistic annual schedules require a larger population, and full races, complete histories and storage still cost time. The interface remains responsive while that work runs. Memory use also grows with permanent history; this is not an unlimited-world or unlimited-browser-storage guarantee. The benchmark script reports actual timings and memory rather than asserting hardware-specific promises.
