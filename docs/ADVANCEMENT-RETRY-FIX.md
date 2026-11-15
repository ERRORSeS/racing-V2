# Advancement retry after a worker failure

A failed first checkpoint invalidated the mutated worker world. The next advance
assumed that world was still resident and threw “Reload the saved career before
advancing” indefinitely. A recreated worker had the same problem.

`src/background-jobs.js` now reopens the canonical saved checkpoint when an advance
has no resident world. Loading progress stays inline. Revision checks run before
simulation: if the stored revision is newer than the displayed one, return the
checkpoint without advancing, so the player can check the date and click again.
`src/app.js` explains that retry is available instead of requiring a page reload.
No save is deleted, and a partially simulated failed skip is never treated as a
successful persisted advance.

`scripts/check-advance-retry.cjs` reproduces the old failure by injecting a failure
at the first checkpoint. Before the fix, the next click failed with “Reload the
saved career before advancing.” After the fix, the retry saves exactly day 1;
Horses remains open with zero loading replacements, page exits or page errors.
A fresh worker with a stale revision returns the current checkpoint without
advancing; another fresh worker with the correct revision advances to day 2.

The V9 browser checks also passed: month and queued day skips, navigation, auction
archive, mobile names, reload and unchanged historical results. The affected
player's exact error/save was not available, so this verifies a concrete retry
failure rather than claiming to reproduce every possible advancement failure.

Build, syntax checks and 38 focused engine/save regression tests passed.
