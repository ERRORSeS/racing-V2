# v0.2 implementation report

The original repository was empty. v0.1 introduced an isolated buildless browser app. This revision retains that application and the existing Site identity, upgrades schema 1 saves, and adds connected engines.

Changed existing files: `README.md`, `docs/IMPLEMENTATION.md`, `package.json`, `src/app.js`, `src/rules.js`, `src/storage.js`, `src/style.css`, `src/world.js`.

Added modules: `src/core.js`, `src/career.js`, `src/care.js`, `src/racing.js`, `src/market.js`, `src/breeding.js`, `src/registry.js`, `src/upgrade.js`, `src/starters.js`, `src/ui.js`, `src/time-worker.js`.

Added validation: `test/systems.test.js`, `scripts/check-decade.js`. The existing `test/world.test.js` remains active and unchanged.

User-requested behavior:

- Journal is the first dashboard panel. Clear saves a cursor, not a destructive history deletion; archive and horse histories remain accessible.
- Sales show short descriptions, linked sire/dam profiles, starts(wins-seconds-thirds), and lifetime prize money. Parents have their own career/profile views, with uncertainty disclosed for old unknown records.
- Home country is editable without rewriting birth jurisdiction, historic results or official ages.
- New careers offer five already-defined prospects, with three selected by default and optional additional candidates/customization. Selection preserves exact attributes and ancestors; adding a candidate does not alter existing cards.
- Auto balanced works per day, with a visible daily report, exact-once session handling, rest and welfare pauses. All time controls use the same daily service.
- The original twelve destinations all operate on canonical persisted state, including race results, care, breeding, markets, inspections and freezer. They are compact connected systems; the README explicitly lists remaining master-spec depth.

Validation: 23 engine/rendering regressions, static build, JS syntax and diff checks; ten-year seeded simulation, compressed save and reload. No browser automation tool is available in the selected managed environment, so browser click-through testing is not claimed.
