# V6 release priorities: implementation and evidence

Source: `Racing_Game_V6_Complete_Prompt_RESENT.pdf`, particularly §§88–96 and acceptance cases 153–184. The user's clarification governs soundness: a remaining racing-year reserve never grants injury immunity. This report covers the V6 repair priorities, not a claim that every cumulative V3/V4/V5 feature in the PDF is complete.

## Implemented

- **Verified careers.** `career-timeline.js` validates dated completed race identity, chronological and official age, sex and birth-jurisdiction conditions, published win/rating restrictions, retirement/death chronology, class, pre-race readiness, recorded nomination owner/jockey, placement and purse against canonical result rows. Generation, listings, stud books, imports and durable saves share these checks. Genuine juvenile G2/G1 races remain permitted. Unstarted prospects retain zero starts and earnings.
- **Legacy repair.** Existing saves receive an idempotent audit. Mismatched summary rows normalize to actual events; impossible/unlinked claims move to a per-horse quarantine with their original data and reason. Horse IDs, pedigrees, actual result events, ownership and money are preserved. Official summaries, qualifying points and race honors exclude unsupported claims; producer honors retain valid offspring evidence. The Career panel displays excluded records.
- **Evidence in catalogs.** Career filters distinguish unraced, maiden, winner, stakes placed/winner, pattern winner and juvenile stakes winner. Grade buttons on sale, parent and stud cards open the actual result. Registry titles remain separate. NPC elite-juvenile consignment frequency is configurable (2% monthly selection chance among actual G1/G2-winning juveniles by default), without restricting legitimate races or player sales.
- **Responsive advancement.** Day/month/year requests execute through a FIFO queue. Navigation, guide, existing profiles, replay and export remain usable during a skip; mutations wait to prevent conflicting edits. No time-skip overlay or inert shell. Progress reports durable checkpoints at intervals of no more than 30 simulated days. The UI shows the previous committed world until the new state returns. An interrupted job rolls back to its last saved checkpoint rather than replaying settled races.
- **Reduced transfer cost.** The worker retains its acknowledged world and receives revision/day requests instead of a full world copy for every skip. Returned patches omit unchanged completed race archives and unchanged pedigree ancestors, and append only new workout, event, ledger and horse-history rows; a regression test verifies reconstruction of the exact complete world. A cooperative task fallback handles browsers without Worker support.
- **Ordered persistence.** Writes compare the expected revision inside the same IndexedDB transaction as the commit. Stale tabs cannot overwrite newer state. Compressed immutable checkpoint chunks and atomic current/backup manifests retain both revisions. Normal writes append a delta rather than copying every old race, workout and horse career; unreachable chunks are removed only when neither manifest references them. This also avoids oversized native IndexedDB values in long careers. Older native, gzip and string saves remain readable. Save failures retain dirty state, show a warning and expose export/retry/reload actions. Saved appears only after an acknowledgement.
- **Fatigue.** A central service records training, racing, travel, starting and youngstock loads plus actual daily recovery. Acute fatigue remains distinct from injury, clearance, physical condition, racing-year soundness and fitness. A bounded 28-day log supports 7-/28-day workload and a visible recovery breakdown. Individual Rest/Light/Balanced/Intense policies and a configurable Protect Recovery threshold apply during automation. Planned breaks suppress incompatible training/racing until review; review-due notification fires once. Small residual fatigue snaps to zero.

## Acceptance evidence

| PDF cases | Evidence |
|---|---|
| 153–154, 158 | Generated unstarted juvenile/youngstock distribution test; no personal starts, winnings or stakes achievements. |
| 155–157 | Actual simulated juvenile G2 winner allowed; adult-only age/readiness violations and altered purses rejected; career filters follow actual wins. |
| 159–160 | Founder careers and relisting/purchase invariants in existing tests; canonical nomination owner, jockey, prize and result checks. |
| 161–162 | Ordinary juveniles remain unstarted; elite NPC consignment policy uses earned results and configurable deterministic selection. Existing full-field and qualification tests preserve legal competition. |
| 163–164 | Idempotent quarantine/canonical normalization tests and grade evidence links. Original events and balances retained. |
| 165–167, 169 | Browser: rapid month clicks advance exactly 60 days; navigation remains available with no overlay. FIFO unit test and progress/checkpoint browser checks. Benchmarks below state actual completion times. |
| 168, 180, 182 | Day-by-day and month advancement produce identical RNG, results, coverings, ledger, news, awards and fatigue logs. Export round-trip preserves fatigue. |
| 170 | Browser: begin a ten-year job, reload after its first checkpoint, validate the reopened world and unique settled result IDs. Rollback is supported; the remaining requested years are not silently resumed. |
| 171–173, 176 | Existing save-queue coalescing/failure tests; browser stale-writer rejection preserves newer edit; injected worker save failure leaves navigation usable, warning visible and export available. |
| 174–175 | Existing race/purse/auction settlement and round-trip tests; browser skip persistence validates committed results on reload. |
| 177–179, 181, 183–184 | Rest/light month reaches 0–5 fatigue; severe injury remains restricted despite zero fatigue; workload log stays separate; break suppresses racing and produces one review notification. |

The reusable browser regression script is `scripts/check-v6-browser.cjs` (run a local server on port 5173 and provide Playwright plus `/usr/bin/chromium`). Additional profiling/fault-injection probes are in ignored `work/`; domain regression tests are in `test/v6-release.test.js` alongside the existing suites. Performance measurements are engineering observations from this workspace, not guarantees for every browser/device.

## Validation and measurements

The complete suite passed **91 tests**, with zero failures. Subsequent focused regression runs cover the final compact patch representation. The production build and Chromium checks passed: FIFO skips, stock/profile navigation during work, stale-writer rejection, durable training policy, interrupted long skip, save-failure warning/export controls, no-Worker fallback, current/backup reconstruction and legacy compressed-save migration.

Latest built-site benchmark, USA career with ten simulated historical years, initially **1,419 horses and 1,004 results**:

| Skip | Click feedback | Navigation after click | Durable completion |
|---|---:|---:|---:|
| 1 day | 41 ms | 102 ms | 1.05 s |
| 30 days | 42 ms | 110 ms | 3.76 s |
| 360 days | 30 ms | 68 ms | 46.76 s |

No fullscreen overlay or inert shell appeared. Final saved state: **day 391, 3,965 horses, 4,405 results**, validated after reading the checkpoint manifest. Measurements include simulation, persistence and the returned UI state; some probes ran concurrently, so they are not a controlled device benchmark. The small-skip completion targets in the PDF remain unmet: immediate feedback does not mean a month finishes in 100 ms or one second.

A raw year-old world was approximately 299 MB of JSON. Incremental compressed checkpoints avoid repeatedly serializing all of that history; an earlier comparable full-snapshot benchmark took about 144 seconds. Full native snapshots also stalled once the career grew large, so the final storage path uses bounded checkpoint chunks instead of one oversized native value.

## Remaining scope and limits

Full multi-decade completion/performance and every case in the cumulative 1–184 acceptance list have not all been certified. The game still uses synthetic 30-day months and original local fixtures; broader real-world international classic calendars, advanced seasonal stud-farm contracts, annual sire leaderboards and richer farm management remain separate cumulative scope. A rest period becomes Review Due at its end date; medical/return review is intentional, rather than automatic clearance at zero fatigue. Browser closing during a long skip keeps the last durable checkpoint and cancels the uncompleted remainder.
