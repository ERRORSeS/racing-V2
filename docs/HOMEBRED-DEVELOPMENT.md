# Homebred competitiveness repair

The correction changes birth, inherited potential reconciliation and development.
It does not change race winner/placing/speed/margin formulas or historical results.

## Causes

- Foals started every racing skill at 5 and received no physiological baseline
  growth. Youngstock education raised a different set of handling skills; formal
  starting passed checkpoints but did not resolve the gap. Generated race stock
  arrived with developed skills. Recovery and surface aptitude also stayed at 5,
  compounding the disadvantage while trained skills were spread over many workouts.
- Birth inherited a genome in `horse()` and sampled another in `foal()`, after
  dependent development data had already been initialized.
- Prepared reserve/creative horses could have intrinsic caps such as 94 while
  their sampled quantitative markers still expressed ordinary caps around 60.
  Their real winning careers did not change that mismatch, so offspring inherited
  much lower caps than the displayed parental potential suggested.

## Corrections

- Birth uses the single inherited genome already initialized by `horse()`.
- Only horses linked to actual foaling records receive healthy natural baseline
  growth through 720 days. The target is capped by innate potential, maturity and
  structural safety. Athletic baseline reaches 50% of potential, aptitude 65%,
  disposition 60%; education depends on the horse's own handling development.
  Newborns remain at newborn skills. Care/medical gates remain, and higher existing
  trained values are never reduced. Repeat calls do not stack extra gains.
- Existing actual foals gain a deterministic birth marker from their permanent
  pregnancy record. Daily development can fill the missed baseline in old saves.
  Existing DNA, potential caps and results are retained; no old foal is rerolled.
- `breedingGenome()` reconciles explicit intrinsic cap overrides for future
  matings with modeled per-skill potential offsets. Offspring inherit the mean
  parental offsets alongside the existing segregating marker blocks and individual
  developmental variation. Stored parental DNA is unchanged. Coat alleles, linked
  phase, Mendelian inheritance and inherited reliability are preserved.
- Parental learned skills, earnings, wins and awards are never used as inherited
  ability inputs. Ordinary unedited genomes retain their original inheritance.
  Creative catalog cap changes are now marked consistently. Legacy uniform cap
  overrides are recognized without editing existing parents.
- Breeding previews use the same reconciliation and remain deterministic with a
  separate RNG stream. Optional inherited offsets are validated in saves.

## Verification

`test/homebred-development.test.js` covers single-genome consistency, newborn
skills, healthy growth, ceilings, repeat-call idempotence, old-save catch-up,
parent-DNA preservation, exclusion of learned skills/wins from inheritance, and
six actual maiden races for grown/trained offspring of recorded race winners.
The offspring retain variable potential and are capable of genuine wins through
the unchanged competition engine. This is a capability regression, not a promise
that every foal of winners will win.

A separate local before/after probe used eight seeded offspring of the same real
winning parents (both displayed speed caps 94). On the previous code, offspring
speed caps were 52–61; on the corrected inheritance path they were 90–100. Their
prepared race results improved without any edits to the racing simulator. The
sample is specific to those elite parents and suitable maiden competition.

`scripts/check-homebred-browser.cjs` loads an existing-born horse missing its new
birth marker, completes starting, advances a day, manually saves and reloads.
The browser fixture's speed rose from 5 to its age-appropriate baseline of 47.5
with potential 95; stored DNA/caps and sampled past results remained identical.
Manual saving remains in effect: click Save career before leaving.
