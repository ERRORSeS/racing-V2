# V8 mare covering, pregnancy and foaling

Source: Racing_Game_V8_Complete_Codex_Prompt.pdf, especially §§104–111 and acceptance cases 212–239. The attachment is treated as a product specification under the user's request, not as authority to change unrelated instructions or competitive race formulas. Earlier V1–V7 features and recorded results remain. This update implements the new V8 reproductive workflows; it does not claim all older cumulative wishlist items are complete.

## Working domain model

- `breedingAttempts`, `pregnancies`, `pregnancyScans`, `studContracts`, and immutable `reproductiveEvents` link through real mare/sire IDs. The existing `coverings` and `horse.pregnancy` references remain compatible with existing saves. Their conception/due fields are internal compatibility data; presentation uses one pure summary selector and does not expose hidden conception or committed delivery dates.
- Covering records today’s actual service, fees, original owners, breeder, method and registry. It shows Covered by / date immediately. Duplicate services cannot create a second active pregnancy. No live foal exists before birth. Owned mare/owned stallion service has no fee; actual outside-stud fees and NPC/player income are recorded. Natural service requires both parents settled in the same country and eligible retired, mature breeding stock. Retire and Use This Stallion controls are connected to the actual engines.
- Conception remains seeded and uncertain, influenced by age, modeled seasonal timing, fertility traits and method. Estimates vary from 340–345 days; hidden term uses a centered distribution inside the configurable model's 320–365-day range. Each pregnancy samples once. Calendar arithmetic uses simulation days and 30-day months, independently of racing age.
- Day-15 ultrasound, day-28 heartbeat and day-50 development visits are real appointments with actual costs/reports. Early booking does not diagnose pregnancy. Auto-vet and NPC care use the same due-day visit function; insufficient funds leave a pending task. Repeated visits/processing cannot duplicate a same-day fee/report. Negative scans preserve the attempt and permit rebooking after recovery.
- Rare committed loss and multiple-risk findings take monitored branches. Multiple-risk care/rechecks never generate twins. Loss ends the gestation, preserves history, schedules recovery and requires reproductive clearance; auto-vet/NPC review obeys elapsed recovery and budgets.
- Late-gestation automatic care adjusts ration/condition gradually; care and foaling-watch actions preserve genes. Demanding manual work is explicitly rejected; appropriate light exercise/rest retains existing medical restrictions. Scans/conditions/outcomes run before birth and ordinary mare/foal care on every actual daily tick.
- One outcome creates one foal at the committed day, with actual parent IDs, inherited genome, height/youngstock care, location, registry, breeder and current mare owner. Postpartum and nursing/weaning systems continue. Sire sale/death never breaks pedigree links. Mare sale retains the pregnancy and records sale-time maternity disclosure/rights. Confirmed pregnancy contributes a bounded appraisal component without rebasing the V7 scale or touching historic paid prices.

## Connected surfaces

Mare roster badges, prominent expandable profile header, pregnancy card, Breeding/Stud owned and NPC tables, chronological due sorting and status filters, Vet appointments, Dashboard breeding calendar/recent births, World Calendar, market roster, auction lots, sire covering/produce history and linked profiles share the same records. The hidden delivery target is excluded from summaries. Guide topics explain covering versus confirmation, scans, gestation days, due windows, foaling watch, care, contracts and offspring; opening help changes no state.

## Migration and persistence

The save envelope remains schema 7 for compatibility, with reproductive sub-schema 8. Missing V8 collections are added deterministically; existing covering facts and valid pregnancies/foals are retained. Legacy due targets are not rerolled. Unknown service/confirmation dates stay unknown, and legacy active pregnancies receive a real review recommendation. IndexedDB upgrades force a full snapshot base so appended-only archives cannot lose migration fields. Subsequent patches carry reproductive records with ordinary autosaves. No separate save button or blocking pregnancy modal is required.

## Verification

`test/v8-reproduction.test.js` names each acceptance case 212–239 and includes a ten-year reproductive simulation. It covers owned/NPC studs, negative/positive scans, distribution/countdowns/year boundaries, hidden targets, actual time-skip births, sales, genetics, simultaneous births, loss/clearance, monitored multiple-risk findings, alternative AI registration, migration, idempotent costs/reports and shared UI/help. Prior management, genetics, foal care, fatigue, travel, storage and race tests continue to run.

`scripts/check-v8-browser.cjs` exercises the live Stud → select stallion → cover → book scan → skip 15 days → mare panel → Guide → reload workflow for owned and actual NPC studs. It checks zero own-stud fee, outside fee, day-15 confirmation and persisted scan chronology.

The pre-existing release checklist still records older outstanding items such as expanded international classic series, advanced proxy auctions/auction contracts and full cross-browser certification. Those are separate from the V8 mare additions and are not silently presented as finished.

## Changed files

- Added `src/reproduction.js`, `src/reproduction.d.ts`, `src/pregnancy-ui.js`: records, migrations, lifecycle/scan services, shared selectors and presentation.
- Updated `src/breeding.js`, `src/world.js`, `src/care.js`, `src/upgrade.js`, `src/storage.js`: actual covering/birth hooks, daily processing, safe work, migration and validation.
- Updated `src/market.js`, `src/valuation.js`: fixed sale-time disclosure snapshots, ownership continuity and bounded confirmed-pregnancy appraisal evidence.
- Updated `src/ui.js`, `src/auction-ui.js`, `src/app.js`, `src/guide.js`, `src/release-checklist.js`: connected controls, cross-tab status, appointment/care actions, guide and release notes.
- Updated `src/rules.js`, `package.json`, `README.md`: gestation range, V8 package label and documentation entry.
- Added `test/v8-reproduction.test.js`, `scripts/check-v8-browser.cjs`: cases 212–239, long-run persistence and an additional unconfirmed-negative sale roundtrip regression.

Validation also checks that a later scan cannot rewrite a past sale disclosure. Frozen-service and negative-conception branches preserve alternative registry restrictions and unknown/unconfirmed values through exact save roundtrips.

## Recorded release checks

- Full local regression run: **155 passed, 0 failed**.
- Added afterward: unconfirmed unsuccessful-covering sale roundtrip passed; affected disclosure, migration, loss, shared-view and Guide cases passed again after final refinements.
- Production build passed. Final Chromium runs passed both owned-stud and actual NPC-stud workflows, preserving day-0 cover/day-15 confirmation, fee, report and reload chronology.
- Competitive `src/racing.js` and `src/random.js` have no changes in this PR. Long whole-world skips remain computationally heavier than the isolated reproductive simulation; the existing background worker/queued autosave flow stays in use.
