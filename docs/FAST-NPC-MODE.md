# Fast skips with a fixed NPC population

Enable **Settings & backups → Disable NPC growth · enable fast skips**. The toolbar
then reads **Fixed opponents · NPC growth OFF**. The setting is saved and reversible;
existing careers retain live NPC mode until the player enables the option.

Fast mode skips NPC daily development, background breeding, campaign planning,
world-only racing, reserve recruitment and pedigree-history generation. Monthly
sales rotate existing stock without creating horses. Your horses continue daily
training, care, recovery, injuries, pregnancies/foaling, travel, auto entry and
financial events. Player-related sales and breeding evidence remain real changes.

Entered player races use varied reusable profiles from existing horses, including
retired racing profiles. Profiles are prepared copies for the competition, not new
horse identities or invented prior achievements. NPC profiles do not receive starts,
prize payments, injuries, titles or qualification points. Player eligibility and
career rules remain; competitive finish-time calculations are unchanged. Completed
races label fixed opponents explicitly. Past results and actual NPC careers remain
intact when switching either direction.

## Engine and persistence

- `fast-mode.js` tracks the option, current owned horses and changed records.
- `fast-opponents.js` selects fixture-dependent fields and prepares isolated racing
  profiles. Canonical NPC skills, career, health and ownership are untouched.
- `world.js`, `racing.js`, `reproduction.js`, `travel.js`, `market.js` and auction
  rotation process player-relevant events without growing the background world.
- `world-patch.js` scopes fast deltas to owned/changed horses and changed fixtures,
  retains omitted roots and stops repeatedly sending unchanged archives.
- `storage.js` validates changed horses/results against an already validated,
  revision-matching resident world for fast advances. Loads/imports and replacement
  saves still receive full validation. Atomic commits and autosave protection stay.
- The existing live simulation remains available. Full-mode simulation-oracle and
  prior regression checks remain unchanged.

## Validation

- Browser tests enabled the option, skipped a day/week/month, waited for actual
  persisted acknowledgements, reloaded and validated day 38. Observed click-to-saved
  times in the first run were 106/99/195 ms; a run alongside regressions measured
  225/192/366 ms. These are measurements, not universal latency guarantees.
- Four dedicated tests: frozen NPC records/population for a year; varied actual
  player races without NPC career progression; complete fast-patch round trips;
  player pregnancy and foaling with an NPC stud.
- 43 existing focused regression tests passed, including the original complete-world
  live simulation oracle, genetics, ownership, history, saves and V9 features.
- Build, syntax and whitespace checks pass.

Large player stables, many entered races, overdue events, slow device storage can still take more than a second. The UI reports completion
only after simulation and the save commit finish; no artificial instant-success
screen replaces unfinished work. Background NPC campaign realism is intentionally
paused in this optional mode in exchange for speed.


## Repeated-skip save stall repair

Previously, the 24-write or 1,024-part save limit forced a complete-world rewrite
in fast mode too. A pending settings autosave could therefore hold a skip at
“Advancing” before simulation even began.

Fast checkpoints now retain immutable base parts and periodically squash only
changes since that base. Full changed horse records replace prior versions during
squashing; history suffixes are appended exactly once. The pinned base, accumulated
changed IDs and history offsets survive reload. Both current and previous
checkpoint remain protected by the existing revision check and atomic transaction.
Normal live-mode compaction and full import validation remain in place. Settings
saves report their actual stages while a skip waits for them.

Regression coverage includes 60 cumulative saves against a 1,500-part base, plus
browser skips on an aged world with over 10,000 horses at the old full-compaction
boundary. The browser check crosses the new squash boundary, reloads partway
through, checks the previous checkpoint and verifies original race results.
Run `node scripts/check-large-fast-skips.cjs` against the built game on port 5173.

Observed on the 10,570-horse / 1,011-result fixture: 25 day skips took
240–514 ms, a week took 618 ms and a month took 698 ms while regressions also ran.
Each measurement includes the persisted acknowledgement. Reloading halfway through
and after the final save retained day 122, the day-92 backup and original results.
Device storage, player stable size and actual entered races still affect latency.
