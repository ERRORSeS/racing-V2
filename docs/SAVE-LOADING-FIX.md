# Saved-career loading fix

Startup previously waited for optional pedigree-history simulation, stud maintenance and a migration/calendar write before sending the career to the interface. It also built an expensive archive comparison baseline during reading. A blocked database or silent worker could leave the loading request pending indefinitely.

Startup now reads, upgrades and validates the career, then displays it. Necessary normalization writes enter the existing nonblocking autosave queue after rendering. Optional pedigree simulation and stud maintenance run during time advancement. No saved races, horse identities or backups are reset.

Partitioned gzip records decode in batches of at most eight, with ordered checksum verification/application and actual read progress. Legacy whole-world base/patch chunks remain sequential to bound memory. Initial read avoids archive fingerprint serialization; prepared action patches and the pre-advance baseline preserve incremental writes afterward. Save revision protection remains unchanged.

Database opening reports blocked connections and has a 15-second timeout; late connections close safely. A load request with no progress for 45 seconds terminates its read-only worker and offers Retry, Import and Restore instead of waiting forever. Worker error/message-error handling clears pending requests; an unexpected worker rejection no longer poisons its queue. Retry works before a world exists. Failed recovery attempts retain the recovery view rather than opening a new-career wizard.

Original localStorage careers decode in the background loader and save to IndexedDB after the interface opens. The original localStorage copy remains intact.

## Changed files

- `src/app.js`: startup progress, background migration autosave, legacy fallback, watchdog and recovery controls.
- `src/background-jobs.js`: read-only loading, deferred maintenance and reuse of the pre-advance persistence baseline.
- `src/storage.js`: bounded ordered decoding, database safeguards and deferred write-baseline construction.
- `src/time-worker.js`: queue recovery after unexpected failures.
- `scripts/check-load-startup.cjs`: deliberately unavailable history generation, a migration saver that never finishes, blocked database, silent worker and successful retry while retaining the original save.
- `scripts/check-legacy-startup.cjs`: actual schema-2 localStorage migration with identical horse IDs, funds, day and original legacy backup.
- `scripts/check-large-save-recovery.cjs`: wait for acknowledged background normalization before inspecting its durable checkpoint.

## Verification

- 14 focused partitioned-save, index/patch and pre-debut soundness tests passed.
- Startup fault-injection browser checks passed. The stable opened in approximately 2–3 seconds even while optional simulation and migration saving were unable to finish. Blocked and silent-worker cases retained the original manifest and loaded the same career after Retry.
- Actual schema-2 legacy fallback and IndexedDB migration passed.
- V9 browser passed: mobile full names, +30 days, queued +1/+1, auction archive, historical results, pre-debut reserves, saved day 32 and reload; no page errors.
- Import-picker browser passed legacy, portable and unusual-extension imports, invalid-file protection and recovery-screen import.
- Large-save recovery passed with 201 owned horses, the stress-fracture report, retained original backup, portable recovery and exact prior-checkpoint restoration.
- Static build and diff checks passed.

A genuinely large save still needs time to read and validate; progress is shown. The watchdog is an inactivity safeguard, not a claim that a failed or incomplete load has succeeded.
