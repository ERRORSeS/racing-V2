# V6 release-priority repairs

Verified sale careers and legacy record review, queued time skips with browsing available, revision-checked incremental autosave, and individual fatigue/intensity controls. See [V6 implementation, acceptance evidence and remaining scope](docs/V6-RELEASE-STATUS.md).

# Current management update

New race-level guidance, selective news, injury decisions, per-horse registration, stronger monthly training, category-based auction events, simulated founder careers and background saving. See [the feature/compatibility report](docs/MANAGEMENT-UPDATE.md) and [race-level guide](docs/RACE-LEVEL-GUIDE.md).

# V4/V5 work in progress

The next implementation increment adds youngstock care, growth, gradual weaning, formal starting and rotating meetings. See [the coverage and remaining-work map](docs/V4-V5-PROGRESS.md). This is not a completed V4/V5 release.

# First Light — Thoroughbred Stable Manager

A standalone, browser-local Thoroughbred stable management game. This branch adds the connected V3 simulation/guide update and a public GitHub Pages publishing workflow. It does not modify OXO or share its save namespace.

**Public website after the publishing PR is merged:** https://errorses.github.io/racing-V2/

The repository already has Pages enabled with Actions and an environment that allows `main` deployments. The workflow runs tests before building/publishing. Pull requests and the update branch run verification without bypassing the protected deployment environment.

## Run

Requires Node 20+ and Python 3; no npm runtime dependencies.

```sh
npm run dev       # http://localhost:5173
npm test          # engine, genetics, migration and rendered-view regressions
npm run build     # static dist/ output; relative paths support GitHub Pages project URLs
npm run test:long # extended simulation harness; not part of ordinary CI
```

## Playing

Start with five fully defined prospects and select any three or another count. IDs, names, genetics, skills and parent identities are fixed before selection; adding a prospect does not change existing candidates. Optional customization remains available. Choose your home country and economy independently from creative genetics and registration rules.

Assign Auto Balanced and use Next Day to process daily training, care, nominations, travel and results. Rest days and veterinary restrictions remain enforced. The Training screen reports actual gains and plateau/headroom. Open the global **Guide** or a field's **?** on any screen, including setup; the separate drawer preserves the game form beneath it.

The stable journal is the first dashboard panel. Clear only hides previous feed entries; horse histories, race results and the archive persist. Sales and all parent/stud profiles show recorded `starts(wins-seconds-thirds)` and lifetime earnings. Historic unknown records are explicitly distinct from unstarted horses.

## V3 systems

- Twenty-six canonical athletic, racecraft, surface, learning and recovery skill definitions and mapped workouts.
- Separate inherited ceilings, maturity availability, lasting functional limits, current preparation and scouting estimates. Class projection is not an official-entry lock.
- Diploid supported coat loci, dosage/masking, unknown/inferred legacy confidence, linked quantitative haplotypes, bounded performance heredity and independent Monte Carlo mating previews.
- More than 100 contextual trait definitions, persistent instances and dated learned observations.
- Real NPC reservations, published race conditions, country Group/Grade labels, field-health diagnostics, recurring series and reserve cohorts.
- Shared-clock race inputs, acceleration, energy, turning, traffic, tactical/weight effects and causal highlights; results and payouts commit once.
- Canonical historical races and identifiable rivals, NPC stud careers and fee history, deep ancestor links, evidence-based legacy awards and track-record archives.
- Voluntary breaks, review/reconditioning, current/recoverable/irreversible soundness, gradual long-term therapy and veterinary clearance.
- Actual departure, arrival and acclimatization bookings, international campaigns and late-arrival checks.
- Grounded fictional news, read/bookmark/follow controls and monthly catch-up digests.
- Global searchable guide covering the original twelve tabs, skills, workouts, genetics, traits, classes, recovery, travel and model assumptions.
- Existing markets, auctions, breeding, lifetime inspections and creative freezer remain connected to persistent horse IDs.

## Saves

Schema 1/2 careers migrate to schema 3 without resetting IDs, old coats, existing caps, pedigrees, results, money or prior awards. Missing genetic information is labeled inferred or unknown, not invented as a verified negative. Current/previous autosaves use compressed IndexedDB; portable exports are checksummed JSON.

**Saves belong to the browser and website origin.** To move a career from the private preview to GitHub Pages, export it there and use **Import existing career** at the new site's setup screen. Visitors do not see one another's browser-local careers.

## Architecture

| Modules | Responsibility |
| --- | --- |
| `rules`, `skill-definitions`, `race-rules` | Versioned rules, country/class conditions, skills and workouts |
| `core`, `random`, `starters` | Identity, exact funds, events, deterministic RNG and ready prospects |
| `genetics`, `development`, `traits`, `editing` | Diploid/quantitative inheritance, caps, maturity, scouting, contextual traits and explicit creative edits |
| `world`, `reservations`, `time-worker` | Daily orchestration, indexed bookings, NPC lifecycle and background skips |
| `racing`, `history`, `career`, `legacy` | Fixtures/results, historical archive, canonical career selectors and evidence-based honors |
| `care`, `recovery`, `travel` | Training, care/medical/farrier, breaks/therapy and actual movement |
| `breeding`, `stud`, `registry`, `market`, `media` | Reproduction, stud books/fees, lifetime inspection, transactions and grounded news |
| `upgrade`, `storage` | Additive migrations, write validation, backups, compression and imports |
| `app`, `html`, `ui`, `v3-ui`, `guide` | Actions, read-only views, responsive interface and offline searchable help |

## Verification and honest limits

The 38-test suite includes the existing gameplay regressions plus 100,000 seeded diploid transmissions, expression/masking and compatibility checks, 500-workout hard caps, daily training, all-country one-horse racing, overseas arrival, nine-month therapy, full historical stud records, guide definitions/search and an actual schema-2 save fixture. Build, JavaScript syntax and diff checks are also run before the PR.

This is not a claim that every numbered V1–V3 acceptance detail is finished. The visible **Release Checklist** and [V3 release checklist](docs/V3-RELEASE-CHECKLIST.md) identify the remaining full stress matrix, real-browser QA, decade recertification, exhaustive calibration and advanced incident/negotiation/press depth. The selected managed environment lacks its required browser-control tool; HTML rendering tests do not substitute for browser interaction tests.

Read [genetics and racing assumptions](docs/genetics-and-racing-model.md) for evidence versus fictional approximations. V4/V5 PDFs supplied later are reference attachments; their contents were not silently treated as authorization for another implementation scope.
