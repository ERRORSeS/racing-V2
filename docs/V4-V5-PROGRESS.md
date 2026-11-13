# V4 / V5 implementation progress

This is the first working implementation increment against the cumulative V4 and V5 master specifications and both tab guides. It does **not** complete those specifications. The PDF acceptance IDs below identify requirements touched, not a claim that each entire requirement has passed.

## Auto-starting follow-up

Auto Training now automatically creates a starting plan for an eligible unstarted horse and progresses its checkpoints daily. Younger horses receive handling education. Explicitly paused plans remain paused until resumed. Manual Start Horse also enables daily automation; the screen explains rest days, same-day limits and exact readiness blockers.

Navigation keeps the twelve management tabs and restores Calendar, News & Press Room, Travel, Hall of Fame, Settings and release progress in a visible World & Tools group. Phone navigation wraps into a grid instead of hiding destinations in a horizontal strip.

Auction follow-up adds minimum bid increments, checks combined leading-bid commitments, disallows self-outbidding, records sold/passed-in/failed/withdrawn outcomes and explains failed settlement. Closed private listings are unavailable. Market exposes sale-channel/My bids/My listings filters, leader/next bid, bid history and archived outcomes. Advanced auction sessions/proxy bids/contracts remain pending.

## Included in this increment

- Ordinary calendar: four six-race meetings per month and jurisdiction, juvenile maiden/novice/allowance/stakes divisions and older divisions, rotating names/distances/going/classes, two-month publication, deterministic cycle/meeting/fixture IDs, persisted idempotency log, retained booked fixtures and results. Current/Next/All month filters. Existing terminal cancellation remains when eligible runners are insufficient.
- One canonical chronological age/life-stage service; official racing age remains separate. Normal founding horses remain two-year-olds with fixed identities and zero starts, initially unstarted. Introduction-started setup begins a plan. Creative already-ready setup explicitly records passed milestones.
- Additive schema 5 migration from schemas 1–3. Existing actual race starts are evidence of prior preparation; unraced player horses require starting. Migrated height estimates disclose missing prior measurements. Genetics, original caps, identities, funds, records and RNG are preserved.
- Millimeter stature, correct hands/cm conversion, inherited polygenic-style parent baseline plus independent variance, nonlinear growth ending at maturity, shrinking forecast uncertainty, dated measurements and parent stature links. Stature does not change athletic caps.
- Nursing care, real dam/companion IDs, diet/water/shelter/turnout policies, independent eating, separate learned social/handling skills, daily exact ledger costs, routine newborn reviews and permanent care/education logs. Daily automatic education chooses age-appropriate work. Adult gallops are routed away from youngstock.
- Readiness-checked weaning: preparation → gradual transition → monitoring → complete, ten eligible days per stage, actual local companions other than the dam, pause/resume and automatic planning from seven months. Individual sale cannot separate an unweaned pair.
- Ten-checkpoint formal starting from 720 chronological days: staff, pace, per-step attempts/dates/status, sensitive gate behavior, recorded professional readiness reviews, medical/development spell pauses, persistent completion. Auto training routes unstarted horses through the plan. Entry reports the next incomplete checkpoint. Schooling trial creates no official start.
- Persisted individual reliability, bounded centered race-day residual and correlated weekly form; actual recent performance-rating chart. Strong form cannot bypass medical clearance or change innate talent.
- Dashboard youngstock links and recent press; Press Room nested in Dashboard rather than a main tab. Existing factual result/event reporting gains text/year archives, follow-horse/stable actions and one optional accurate post-race interview after a player stakes win. Responses have a bounded reputation effect and cannot change race or medical facts.
- Searchable offline guide articles and engine-derived education/starting definitions; profile controls have real transactional handlers.

## Coverage map and remaining requirements

| Specification area / acceptance IDs | Status |
| --- | --- |
| V4 ordinary monthly rotation, 73–78 | Implemented initial meeting generator; focused idempotency/preview tests. Full twelve-month reload matrix and field-supply tuning pending. |
| V4 named annual events, qualifiers, Triple Crown, 79–84 | Pending. Generated ordinary G1 fixtures are not annual classics. |
| V4 elite supply/campaigns, 85–89 | Prior canonical NPC careers retained. No complete new elite cohort/campaign implementation; older and rating-restricted races can still cancel. |
| V4 reliability/form, 90–94 | Initial persisted model and distribution/save tests. Expanded traits and broad calibration pending. |
| V4 award editions/ceremonies/value premiums, 95–100 | Pending; prior simple annual awards remain and must not be represented as V4 award editions. |
| V4 auction sessions/proxy/premiums/contracts/catalogs, 101–111 | Pending; prior basic auctions/private sales remain. Added dependent-pair transfer safeguard only. |
| V4 complete encyclopedia and 15-year journey, 112–116 | Prior guide plus new implemented-mechanic articles. Exhaustive V4 articles and long-run certification pending. |
| V5 identity/age/early care, 117–122 | Implemented initial canonical engine/UI; targeted regression tests. More individualized care/stress/exceptional-vet depth pending. |
| V5 weaning/care/education, 123–128 | Implemented gradual planner and safe education. Automatic NPC newborn flow uses same services; multi-generation stress verification pending. |
| V5 starting/readiness, 129–135 | Implemented ten milestones, safe auto dispatch and race gate; tested education → populated maiden and medical pause. Facility selection/custom professional schedules/refresher depth pending. |
| V5 height/growth/transfer, 136–140 | Initial model, history, estimates, conversion and cap-independence tests. Modest tack/transport sizing effects and complete auction age catalog pending. |
| V5 press/dashboard, 141–148 | Existing factual news extended with nested Press Room, filters, following and interviews. Multi-outlet editorial ranking, auction links, high-prestige birth selection and rich feature articles pending. |
| V5 long skip/full documentation/CTA matrix, 149–152 | Focused guide/render/handler coverage included; three-year lifecycle and exhaustive browser/CTA certification pending. |

## Validation and limits

The automated suite combines prior engine regressions (explicit creative prepared-horse fixtures when testing racing) and new tests for normal unstarted starters, growth, gradual weaning, handling, starting, medical pauses, a real maiden and form distributions. Test names list related PDF IDs as traceability, not full acceptance certification.

Browser click-through/accessibility testing is still unverified. This managed environment has no supported browser automation tool. Pure rendering tests verify HTML routes and connected data, but do not substitute for interaction testing.

Synthetic meetings are original game fixtures, not real official calendars. Dates use the existing 360-day clock. Height and performance models are disclosed simulation approximations. Existing functionality remains available while the listed unimplemented systems are developed in further increments.
