# Browser restart during time advancement

## Reproduction

The reported “Opening saved career … Your saved progress is kept intact while it
loads” screen is the startup reader. Main `d94360f` could terminate the renderer
while skipping in an older world, without an ordinary catchable game exception.
The earlier first-checkpoint retry fix did not address this failure.

In constrained Chromium (256 MiB old-space budget), seed a real 60-day career,
reload, then click Next month repeatedly. Before this change the first skip could
complete and a subsequent skip crashed. Instrumentation narrowed the failure to
checkpoint preparation/encoding; later stress variants also exhausted memory
while calculating the following month. Fresh-career-only smoke tests missed it.

## Implementation / files

- `src/archive-codec.js`: lossless JSON-to-UTF-8 backing buffers. Runtime payload
  bytes need fewer managed heap objects; persisted records remain ordinary JSON.
- `src/archive-fields.js`: shared accessors for buffered horse metadata. NPC reads
  materialize mutable objects, and explicit phase boundaries repack changes.
  Ancestor reads are immutable. Ownership transfer restores ordinary mutable
  player data. Small simulations restore normal NPC records after loading; ongoing NPC buffering
  is enabled at 9,000 total horse records. Shared prototypes avoid per-horse accessor closures.
- `src/immutable-race-archive.js`: buffer completed replay/causal data and immutable
  start inputs, with complete JSON serialization and exact on-demand replay reads.
- `src/world.js`, `src/racing.js`, `src/simulation-population.js`: yield between
  simulated days, repack at safe horse-processing boundaries, and update live
  references when a runtime record changes representation. Synchronous advanceWorld
  remains available. No race arithmetic or chronological event ordering changes.
- `src/world-patch.js`: omit unchanged bulky fields; preserve encoded identities,
  mutable ownership transitions, complete canonical data and append offsets. Merge
  partial display metadata and trim only display histories after each patch.
- `src/ui-snapshot.js`, `src/action-snapshot.js`, `src/app.js`: keep non-player
  profile detail lazy, retain recent display logs instead of accumulating them
  indefinitely, fully restore player records after purchases, and show actual
  simulation/save phases inline. Display snapshots cannot replace canonical saves.
- `src/storage.js`, `src/snapshot-parts.js`, `src/upgrade.js`: pack modern records as
  they stream from IndexedDB in worker runtime mode, preserve inherited fields
  while applying deltas, and validate/upgrade one materialized horse at a time.
  Save validation reuses each decoded genome/potential rather than decoding it
  for every locus/skill. Failed-world references are released before recovery.
- `src/background-jobs.js`: apply runtime memory policy, retrieve complete replays,
  send full records for non-display callers, and keep progress/recovery inline.
- Existing fault-injection browser checks now inject at checkpoint preparation
  instead of depending on the previous exact validation statement.

No save schema reset, file deletion, past-result recalculation or loss of pedigree
inputs is introduced. Original complete fields serialize into the existing parts
format; runtime buffers/markers are not a replacement save format.

## Verification

- 45 focused regression tests passed: snapshot safety, indexes, V9 rules, complete
  simulation oracle, buffered histories, ownership, mutable player genetics and
  breeding. The whole-world oracle still matches pre-optimization main after a
  month, including every history, result, genotype and RNG value.
- `scripts/check-aged-skips.cjs`: 10,483 horses/day 60 to 16,786 horses/day 150;
  2,137 results, three completed month skips, no spontaneous page navigations,
  renderer crashes or page errors. The larger save reopened and validated, and
  the checked original historical results were byte-for-byte unchanged.
- `scripts/check-advance-retry.cjs`: failed first checkpoint retries correctly;
  cold worker/stale revision cannot advance twice; zero page exits/loading resets.
- `scripts/check-skip-recovery.cjs`: failed second checkpoint retains saved day 30
  and the Horses page; zero loading replacements, page exits or errors.
- V9 browser checks passed: normal/queued advancement, live navigation, mobile
  names, auction archive, saved reload and original race history.
- Buying through a buffered display snapshot preserves DNA/start inputs and allows
  mutable player DNA testing; a buffered NPC stud produces exactly the same foal,
  reproductive history and RNG state as the ordinary-record reference.
- Build, syntax checks and git diff whitespace checks passed.

## Limits

This addresses a reproduced memory-related browser crash. The affected player's
exact save and device were unavailable. The test constrains the JavaScript heap;
it does not emulate every browser/OS eviction policy. Exceptionally large worlds
and very large legacy single-record saves can still require more memory.

The sub-second month target remains unmet. The constrained older-world run took
about 40–63 seconds per month while growing the world; these operations include
real NPC races, training and durable saves. A separate isolated fresh-world browser run took 14.1 seconds for its month
including saving. Memory buffering trades some CPU work for lower peak allocation. This update must not be described as a one-second skip
or a general latency improvement. Further simulation/persistence work is needed.
