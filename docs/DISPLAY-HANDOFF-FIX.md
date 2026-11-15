# Crash after saved-record reading completes

The loader previously decoded the full canonical world in its worker, then
structured-cloned the entire replay, training and event archive into the page.
Finishing the record counter therefore preceded another large allocation and
initial rendering. A browser renderer termination cannot be caught as an ordinary
JavaScript error. This change removes that full-history handoff; it does not claim
to reproduce the affected player's device or recover records absent from storage.

## Changes

- `src/ui-snapshot.js`: display-only horse starts and official result summaries;
  omit replay frames and causal bulk. Keep speed/stamina inputs used in valuation.
  Retain recent event, training and clinical entries with original indices and
  array lengths so IDs and append offsets remain stable.
- `src/background-jobs.js`: compact UI replies for loading, recovery, imports and
  advancement; fetch an individual complete result or horse event history on
  request. Rehydrate the canonical saved world if an idle worker was restarted
  before a save patch or export. Archive read failures retain the resident world.
- `src/app.js`, `src/ui.js`: fetch selected replay/history, keep it outside world
  state, use the selected replay for playback, release replay on closing or
  navigation, and ignore stale replies after changing career or selection.
- `src/world-patch.js`: exclude the display marker from persistence patches and
  preserve sparse history indices with concat rather than array spreading.
- `src/storage.js`: reject incomplete display snapshots and deferred results as
  full saves/exports. The complete worker archive remains the persistence source.

No save schema migration, race recalculation or deletion is introduced. Existing
full saves still load; complete histories remain in IndexedDB and worker exports.

## Verification

- `test/ui-snapshot.test.js`: 3 tests covering payload reduction, exact official
  time/margin and valuation inputs, rejection of display snapshots, preservation
  of full old histories through UI edits, and sparse append indices.
- Existing snapshot, performance-index and recovery-memory unit tests: 12 passed.
- `scripts/check-display-handoff.cjs`: constrained Chromium (256 MiB JS heap),
  3,706 horses, 78 results, about 20 MB added replay archive. No archive frames in
  startup display; selected complete result matches exactly; stored history
  validates unchanged; app reopens without page errors or renderer crashes.
- `scripts/check-recovery-memory.cjs`: 801 owned horses, corrupted current save,
  worker backup restore, export/import and repeated restoration; no renderer
  crashes or page errors.
- `scripts/check-v9-browser.cjs`: mobile full names, live navigation during month
  advancement, queued days, auctions, reload and unchanged historical results.
  Month including persistence took 11.2 seconds in this run; this fix does not
  claim a one-second month simulation.

The canonical world still needs sufficient worker memory. Extremely large saves
can exceed browser limits there; this is a reduction of renderer handoff memory,
not fully disk-backed lazy simulation. The affected player's own save was not
available to reproduce their exact crash.
