# Content Pipeline

## Source of truth
- `src/data/worldCountryCatalog.ts` — country baseline data
- `src/data/resourceSpecialization.ts` — strategic resource gameplay specialization
- `src/data/ministries.ts` — cabinet definitions
- `src/data/technologyTree.ts` — technology definitions
- `public/assets/visual-pack-1/` — authored visual assets

## Rules
1. Game systems consume typed configuration; UI must not own simulation formulas.
2. New technologies must have an id, category, cost, prerequisite list and description.
3. New ministries must define visual identity separately from engine effects.
4. Real-world sourced values and gameplay estimates must remain distinguishable.
5. Save schema changes require a schema-version bump and either a migration or explicit rejection of incompatible saves.
6. Random simulation must use the seeded RNG only.
