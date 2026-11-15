# Click and month-skip performance

Ordinary actions clone the affected horses, preserve immutable race archives, and send changed horses/history additions to the simulation worker for autosaving. Full save validation and revision checks still run in the worker before committing. A missing worker snapshot falls back to a complete save. Bulk care and travel retain broader snapshots where their effects require them.

Race entry forms and field-health diagnostics are calculated when a fixture is opened instead of rebuilding all 50 entry forms during navigation. The simulation uses ephemeral name, family, medical and reservation indexes. Country candidate lists retain the original ordering, including horses travelling to that country. Each day still runs care, training, breeding, injuries, nominations and races. Competitive race formulas are unchanged.

## Measurements

Local seeded `month-performance` career, USA, no pre-generated history, two race-ready starters:

| Month | Before simulation | After simulation |
| --- | ---: | ---: |
| 1 | 6.1–6.3 s | 3.4 s |
| 2 | 5.3 s | 2.6 s |
| 3 | 6.7 s | 2.9 s |

The complete worlds after all three months matched the original after removing only the now-lazy `fixture.fieldHealth` diagnostic. RNG, horse records, medical records, race results, replay data and finances matched. This is a local comparison, not a universal one-second guarantee. Browser checkpoint writes, history generation and career size add to skip completion time.

In headless Chromium, navigation to Races and the training policy action handler each took approximately 16 ms in a month-old test career. A separate two-month queued-skip browser test completed in 11.1 s including saving; navigation during the skips took 307 ms and no blocking overlays appeared.

## Verification

- `node --test test/performance-indexes.test.js`: incremental reservations against freshly built indexes; pedigree order; targeted action/delta round trip.
- `node --test test/fast-fields.test.js test/new-management.test.js test/snapshot-parts.test.js`: 26 passing tests.
- `node scripts/check-click-performance.cjs`: lazy entry controls, ordinary action, saved policy after reload, no page errors. Prints timings rather than asserting machine-specific thresholds.
- `node scripts/check-v6-browser.cjs`: queued skips, navigation, CAS conflict protection, per-horse policy persistence, interrupted skip recovery.
- `npm run build`.
