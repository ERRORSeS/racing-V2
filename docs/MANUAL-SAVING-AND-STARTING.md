# Manual saving, instant starting and training gains

The live interface now uses manual saving. Click **Save career** after edits and
skips and before closing or reloading. **Unsaved changes** means progress is only
in memory; **Saved** appears after the IndexedDB commit. Initial creation/import
and explicit restore/export flows still commit their checkpoints. No timer or
page-hide event saves automatically. The existing current/previous backups and
revision protection remain. A failed write retains unsaved changes for explicit
retry; retrying does not append the same history twice.

Time skips synchronize pending UI edits into the resident simulation and process
chronological daily events without storage writes. Fast-mode dirty records survive
multiple skips until the explicit save. Leaving and re-entering live NPC mode forces
a complete explicit checkpoint so NPC progression cannot be omitted. Closed fixtures
and unchanged array roots no longer travel from the UI back to the worker on each
fast skip. Same-length news edits, swapped entries and changed NPC records still
synchronize correctly.

From 24 chronological months, open Horse → Training or Youngstock & Starting and
use **Max handling & auto-start**. It maximizes the nine youngstock handling skills,
completes all ten starting checkpoints, records the convenience action honestly,
and enables Auto Training. It preserves athletic skills, genetics, conformation,
potential caps and existing histories. Ownership, age and medical/travel/recovery
gates remain. Players may still use the original gradual starting system.

Player workout gains are doubled through the shared training calculation, for both
manual and automatic workouts. Maturity, fatigue, condition, recovery and individual
potential still cap learning. Daily work is limited to one physical session and
automatic programs keep rest days. NPC workout rates and competitive race formulas
are unchanged.

## Verification

- Dedicated unit checks cover instant starting and save round trips, gates, equal
  doubled manual/auto gains, caps, duplicate sessions, explicit-only saving and
  fast UI synchronization with 20,000 closed fixtures.
- `scripts/check-manual-session.cjs`: 60 days of live population growth followed by
  720 days in fast mode, producing 10,453 horses at day 780. Use instant starting,
  a manual sprint and automatic training, skip day/week/month plus three rapid day
  clicks, verify zero automatic writes, explicitly save and reload day 821. Check
  training, population and original sampled race results. Observed final run:
  day 261 ms, week 264 ms, month 561 ms; explicit save 1,102 ms. These are local
  measurements, not universal guarantees for devices or very large player stables.
- `scripts/check-manual-retry.cjs`: injected save failure and retry append a pending
  journal event exactly once; unsaved NPC changes after switching to live mode
  survive manual saving.
- Existing fast-skip and repeat-breeding browser checks now explicitly save.

Scripts require a built game served on port 5173 and Playwright/Chromium.
The older autosave-era timings in FAST-NPC-MODE.md describe previous releases;
this document describes the current manual-save behavior.
