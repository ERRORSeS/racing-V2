# Genetics and racing model — V3 implementation

This register separates documented genetic segregation and racing terminology from explicit simulation assumptions. It is not real veterinary, breeding or transport advice.

## Evidence-based representations

- Extension / MC1R E/e: e/e is chestnut base. ASIP A/a modifies black-pigment distribution and is masked in chestnut.
- Gray is inherited separately from the base and lightens appearance over time without editing stored alleles.
- Cream and pearl are alternatives at SLC45A2, including dosage, carriers and Cr/Prl. Dilution names are phenotype projections over the underlying base.
- Named KIT variants (SB1, W20, W5), SW1 and tobiano are distinct from ordinary polygenic markings. Silver is masked in chestnut. Champagne, dun/non-dun and mushroom have separate supported modules. Expanded variants have zero default realistic-founder frequency.
- Known incompatible EDNRB O/O and the modeled W5/W5 combination cannot be created as viable horses. Known carrier-by-carrier pairings are blocked; money and editing cannot waive this protection.
- MSTN C/T contributes only an overlapping distance tendency, not speed, grade or champion status.
- Natural covering and fictional alternative-registry frozen AI remain separate historical registration methods.

References supplied with the specification:

- [UC Davis VGL coat genetics](https://vgl.vetmed.ucdavis.edu/resources/horse-coat-color)
- [UC Davis full color/pattern panel](https://vgl.vetmed.ucdavis.edu/panel/full-coat-color-pattern-panel)
- [Hill et al. 2010: MSTN and distance association](https://pubmed.ncbi.nlm.nih.gov/20098749/)
- [Review of Thoroughbred performance genetics](https://doi.org/10.1146/annurev-animal-020420-035235)
- [BHA race-type glossary](https://www.britishhorseracing.com/regulation/glossary-of-race-types/)
- [IFHA classification context](https://www.ifhaonline.org/default.asp?area=2&section=IABRW)

No proprietary game code, authenticated gameplay content, branded fixtures or assets were used.

## Explicit game approximations

Four SIM_BLOCK quantitative haplotype blocks with eight markers each model heritable, correlated athletic/behavioral predispositions. Gametes retain parental phase with configurable marker recombination. Effects, founder distributions, deviations and bounds are versioned in `skill-definitions.js`. These are deliberately fictional markers, not real gene tests. Learned skills, conditioning, money, wins, awards and learned fears are not copied into a foal's genome.

KIT and tobiano use a linked phase approximation with a 2% recombination default. This is a game assumption, not a measured equine map distance. Complex compound KIT haplotypes, every named white variant and all real health-disorder tests are not exhaustively modeled. Unknown historical variants remain null/unknown. Ordinary high white does not prove SB1.

Shade/white expression uses inherited quantitative modifiers with individual developmental variation; Minimal/Medium/Maximal does not behave as an independent Mendelian allele. Founder populations are sampled as viable recorded animals, so incompatible unobserved ancestral conceptions are excluded rather than represented as living horses.

Each skill keeps one canonical current value and one innate ceiling. Maturity and irreversible functional limits derive an available ceiling. Training records headroom, gain, plateau and fatigue without increasing innate potential. Scouting estimates are uncertain and independent from official ratings. Class projections use context-specific mature performance benchmarks, not legal-entry locks.

The race engine uses a shared clock, acceleration, energetic reserve, surface/distance fit, tactics, turning/traffic, focus/composure, carried weight, jockey and bounded horse-day variability. Break delay, boxed passage, contested pace, wide travel and late effort are recorded with their actual mechanical effects. Official ratings derive from completed performance rather than pedigree or training alone. Historical races use a coarser shared-clock simulation and explicitly lack detailed segment replays; their fixtures, rival rows and prizes are canonical. Historical prizes are not credited to present accounts.

Breaks, recovery stages, medical windows, current/recoverable/irreversible soundness, travel durations/costs, fictional fixtures, stud capacity, fee response, awards and news are game abstractions. Registry Golden/Elite titles are not official racing champions. Legendary Racer requires four verified G1 wins and 100 legacy points; reproductive honors require identifiable G1-winning offspring across crops.

## Migration and limits

Schema 1/2 imports preserve old appearances, IDs, relationships, recorded results, funds and existing caps. New loci not recorded in old saves stay unknown; existing coat panels are marked inferred rather than retroactively verified. New skill limits are deterministically tied to stored potential and world seed. No historical pedigree or child genome is silently rewritten after a creative parent edit.

The inherited model does not claim full scientific prediction, exhaustive local regulatory compliance or complete implementation of every detailed V3 acceptance gate. Browser interaction QA, the complete 100-seed-per-country 180-day stress matrix, every steward/DNF incident type, advanced negotiations/press requests, and exhaustive variant/skill empirical calibration remain open verification/depth items. The public release checklist records these limits.
