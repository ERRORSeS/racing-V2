# Faster skips, full fields and safe racing years

- Circuit jockeys are added as real persisted entities whenever a jurisdiction lacks available riders.
- Prepared ordinary-race reserves have real IDs, parentage and truthful unraced careers. Published rating, win and points conditions are never fabricated. NPCs can reassign existing qualified horses while keeping other fields viable; player entries are not removed. If no sound qualified field exists, the event reschedules with nominations/fees retained instead of canceling for capacity.
- Already-filled racecards avoid repeated recruitment scans. Family and track-record indexes replace repeated full-population scans; earned honors are recalculated only when relevant wins change them.
- IndexedDB uses fast native transactional snapshots instead of compressing every save. Earlier compressed saves and backups remain readable; portable JSON exports retain their checksum. Native snapshots use more browser storage. Completed skips still wait for the save transaction.
- Fatigue recovery doubles from 7 to 14 base units/day, modified by the existing individual recovery skill.
- Player-facing **soundness now means estimated safe racing years left**. Work and injury use that reserve. Zero or negative years increases injury risk without being an entry lock. The separate clinical condition and active veterinary restrictions remain enforced.
- A 6–12 month Vet therapy course gradually restores 0.5–1 safe racing year, up to a ten-year reserve; it does not increase inherited ability or erase a serious clinical restriction.

Benchmarks on the local generated world: month simulation fell from ~3.9 seconds to ~1.6–2.2 seconds. Chromium measured full month skips including native saves at ~2.5–3 seconds; day skips are lighter. One second is a target, not a promise for large or multi-year careers. Browser checks confirmed compressed-save compatibility, native save/reload, and zero capacity cancellations across two months.
