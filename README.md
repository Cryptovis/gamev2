# The Real President — Reliable Command 0.82

A browser-based grand-strategy prototype built with React, TypeScript, Zustand, D3 Geo, Dexie and Vitest.

Current version: **0.82.0-playtest.1**, branch `dev/reliable-command-082`, save schema 15. Existing schemas 12–14 migrate automatically; incompatible records are skipped when loading previous progress.

This release adds reliable reviewed commands, recoverable saves/tutorial practice, timed research, dated NEWS history and a more compact map/resource interface. See [0.82 playtest notes](docs/PLAYTEST-082.md) and [roadmap](docs/ROADMAP.md) for delivered scope and remaining debt. V3 remains a conditional architectural decision.

```bash
npm ci
npm run dev
npm run check
npx playwright install chromium
npm run test:e2e
```

## Historical 0.40 foundation

## Three-track release
0.40 combines gameplay depth, a first authored visual pack and project-foundation work in one release candidate.

### Game Pack 0.4
- Six-ministry Cabinet allocation system
- Technology Tree v1 with research points and prerequisites
- Resource-processing chain: oil → fuel, iron → steel, grid → electricity
- Combat logistics now consume processed fuel
- Alliance Bloc v1
- Global Council v1: sanctions, ceasefire and humanitarian-aid resolutions
- Council influence economy and global sanctions

### Visual Pack 1
- Expanded vector icon family for resources, military, cabinet, research, intelligence and diplomacy
- Six original ministry SVG artworks
- New Cabinet, Tech and World command surfaces
- Processed-resource visual ribbon
- Continued dark strategic-command art direction

### Foundation Pack 1
- Config-driven ministries and technology tree
- Save schema v7 with incompatible-save rejection
- Asset manifest, content pipeline, release notes and playtest checklist
- Changelog added to the repo

## Existing 0.31 systems retained
- Interactive globe + flat political map
- Polygon country selection
- 1× / 2× / 3× / 5× deterministic game clock
- Dynamic commodity market and strategic resource specialization
- Diplomacy, trade, sanctions, warfare and deterministic combat
- Autosave / manual save via IndexedDB

## Run

```bash
npm install
npm run check
npm run dev
```

Start a **NEW** campaign after upgrading because 0.40 uses save schema v7.

See:
- `docs/RELEASE_0_40.md`
- `docs/PLAYTEST_CHECKLIST.md`
- `docs/ASSET_MANIFEST.md`
- `docs/CONTENT_PIPELINE.md`
- `docs/DATA_SOURCES.md`
