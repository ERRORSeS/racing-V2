# Time skipping: repeated work and interrupted-checkpoint recovery

## Findings and implemented changes

- `src/reservations.js`, `src/racing.js`: fixture booking changes previously rebuilt
  the NPC population and rescanned all completed historical fixtures. Separate
  population invalidation from booking changes. Reconcile tracked scheduled
  fixtures and newly appended fixtures; rebuild fully when explicitly invalidated
  or the fixture array changes. New days still refresh population/travel pools.
- `src/core.js`: archived pedigree additions do not invalidate the NPC race pool.
  New live horses still invalidate it and register in the live population.
- `src/simulation-population.js`, `src/world.js`: retain insertion-ordered live
  horse references within a skip instead of scanning every archived ancestor three
  times a day. Rebuild at the public advance boundary and register births/recruits
  during simulation. Existing daily care, training, exposure and race ordering stay.
- `src/care.js`: calculate the unchanged daily care trait modifiers once per horse.
- `src/npc-campaign.js`: cache deterministic campaign draws by horse identity and
  seed. This does not consume or alter the simulation's random stream.
- `src/storage.js`: prepare save compression in ordered batches of four bounded
  parts and retain tiny parts as plain text. All parts are prepared before the
  existing atomic IndexedDB transaction, revision protection and backup handling.
- `src/background-jobs.js`, `src/app.js`: a later failed checkpoint previously sent
  `replacingWorld`, erased the page and showed loading while rereading the committed
  save. Now it reports inline recovery, leaves navigation/selection visible and
  returns the durable checkpoint with the error. Explicit backup restoration and
  initial startup still use their appropriate loading state.
- `src/guide.js`: explain inline recovery and actual completion limits.

## Validation

- `test/skip-optimization.test.js`: live population insertion/births, population
  scan avoidance, and a complete-world golden oracle from pre-change main
  `f49d8a5`. After 30 days, all data produces the same bounded-part SHA-256:
  `081b6d389b32e8067d52770a79ea7e3ef850417fdeb7e9f39ce766e1728b5448`.
  This includes genes, training, clinical records, results, prizes, campaigns,
  histories and final RNG state. The reference world has 8,953 horses and 619 results.
- `scripts/check-skip-recovery.cjs`: inject a second-checkpoint write failure during
  a 60-day skip. The Horses page stays open; zero loading replacements or page exits;
  saved day 30/revision 2 validates with no duplicate fixture results or page errors.
- V9 browser regression checks pass: responsive navigation, month and queued day
  skips, auction archive, mobile names, reload, history and pre-debut reserves.
- Isolated runs of the same browser check: baseline month including saving 12,505 ms;
  updated 10,938 ms. Navigation during the updated skip took 4.8 ms.

## Remaining limits

The requested sub-second month completion is **not achieved**. This change removes
repeated work and the observed in-app checkpoint recovery screen; it does not claim
that heavy simulation or persistence finishes in one second. World growth, real
NPC races, detailed daily training, history generation and serialization still
have material cost. No races, births, care or other daily events were skipped to
obtain the measured improvement.

A browser/OS process termination can still reload a page independently of this
in-app recovery path. That device-specific case has not been reproduced here.
