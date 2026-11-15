# Recovery memory and page-crash fix

Browser-level “cannot open this page” failures do not provide a JavaScript stack trace. Inspection found concrete memory spikes in the existing recovery path: backups decoded in the renderer and were copied to/from the worker, exports were assembled in the renderer, all historical compressed chunks were fetched together, saved careers remained referenced by an idle autosave queue, and archive comparison baselines retained full serialized ancestors.

## Changes

- `src/storage.js` reconstructs manifest saves one payload at a time. A single readonly transaction stays alive during asynchronous decoding, preserving a consistent snapshot and preventing concurrent writers/garbage collection from removing unread chunks. Other-tab writes wait for the read to finish; revision protection remains.
- Delta chains periodically compact into complete checkpoints after 24 delta writes or 1,024 referenced parts. All current horse/race/breeding histories are retained; the previous checkpoint remains the backup. Only chunks unreachable from both manifests are collected.
- `src/background-jobs.js` restores backups and prepares downloadable Blobs in the worker. Clean exports transfer a Blob, not a second full career. Unsaved exports can overlay the pending patch without committing it. Recovery drops obsolete worker baselines before decoding, and an interrupted skip releases failed state before reloading its last durable checkpoint.
- `src/app.js` uses the worker recovery/export commands. Explicit recovery releases the old renderer world and comparison cache before the replacement arrives. Failure retains recovery controls rather than starting a new career. Recovery has progress/inactivity handling. Partial-checkpoint recovery rebuilds the UI comparison base.
- `src/save-queue.js` releases its strong reference to a successfully saved world, while retaining unsaved changes after failure.
- `src/world-patch.js` stores bounded dual comparison stamps and lengths instead of full serialized archive copies. Persistent save data and its checksums are unchanged.

No race formulas, horse generation, genetics, results or career records change. The additional manifest depth metadata is compatible with existing save formats.

## Verification

- Twelve focused tests passed for packed snapshots, index/patch correctness, bounded archive baselines, same-length historical changes and GC-verifiable save-queue retention/release. The existing save-queue coalescing/failure test also passed.
- `scripts/check-recovery-memory.cjs` passed with a 256 MiB JavaScript heap budget: a corrupt current save, 801 owned horses, backup recovery, worker export, re-import and repeated restores. IDs, original race records and day were preserved; there were zero renderer backup reads, page errors or crashes.
- `scripts/check-save-compaction.cjs` passed 31 writes with compaction and exact current/backup records, plus a deliberately slowed streaming reader while two complete replacements/garbage collections were attempted. The reader retained revision 31 consistently; the writer reached revision 33.
- The existing large-recovery browser passed with 201 owned horses, the stress-fracture report, original backup retention, portable recovery and exact prior-checkpoint restoration.
- Legacy/portable file selection, invalid-file protection and recovery-screen import checks passed.
- Static build and diff checks passed.

The user's exact device-level crash report was unavailable. These changes remove and test the identified recovery memory spikes; they cannot reconstruct data that is absent from every local save and exported backup, or guarantee unlimited world sizes on every device.
