# First Light — Thoroughbred Stable Manager

A standalone browser-local stable management simulator. **Foundation release, not the full master specification.** No OXO repository or save keys are used.

## Run

Requires Node 20+ and Python 3. No npm dependencies.

```sh
npm run dev
# Open http://localhost:5173
npm test
npm run build
```

Start Game opens a setup form for country, seed, owner, stable, unlimited/custom funds and any number of starters. Add/remove cards preserve entered settings. Each starter is a sound, unstarted two-year-old TB. Current ability must not exceed potential. Names are generated or manually entered. Click Start your career, then use Horses, Training, Market, Calendar and Settings.

## Working systems

- Seeded, stored RNG; stable immutable IDs; eight jurisdictions and fictional tracks.
- Separate potential and current skills, personality, base genotype, markings and conformation.
- Persistent two-generation starter ancestry; ancestor profiles link recursively. Unknown historical starts are explicitly unrecorded.
- Private-market ownership transfers, exact integer-cent balances, creative adjustments and dated ledger. Unlimited mode records theoretical cashflow even below zero.
- 30-day months/360-day years, northern/southern racing-age rules, day/month/year skips through one daily service.
- Six-skill balanced programs with rest, diminishing gains, fatigue and basic eligibility gates; dated session records. Monthly persisted mood reviews.
- Search and pagination; horse profiles; rename history; append-only world events.
- Isolated local autosaves and previous-save backup, checksummed export/import, schema and relationship validation. Version 1 is the first schema; unknown future schemas are rejected without resetting the career.

## Architecture

- `src/rules.js`: centralized core rules, countries, calendar, racing age, money.
- `src/random.js`: RNG, IDs, multiword names.
- `src/world.js`: world generation, ancestry, transactions, training, daily time service.
- `src/storage.js`: save envelope, integrity checks, validation and backups.
- `src/app.js`, `src/style.css`, `index.html`: responsive accessible browser interface.
- `test/world.test.js`: seeded engine and persistence regressions.
- `scripts/build.js`: dependency-free static packaging to `dist/`.

## Remaining work

The supplied specification remains the product target. This stage does **not** implement race entry/resolution/replays, jockeys, injury/medical/hoof services, fully integrated feed/tack, hereditary offspring genetics, pregnancy/foaling, stud/freezer, inspections, auctions, NPC dynasty progression, staffing, full configuration wizard, theme controls or all twelve final navigation destinations. Fixtures are reference schedules and close without producing invented results. Mood and training are foundational subsets, not the complete welfare engine. Raw histories currently grow in memory/localStorage; decade-scale storage/performance is not yet certified. Import is designed for trusted personal exports; schema validation will need expansion alongside each new engine.

Seven automated engine tests pass. Static build and JavaScript syntax checks pass. Browser QA was not run: the managed Sites environment has no browser-control tool. UI workflows require browser verification before calling the foundation fully validated.
