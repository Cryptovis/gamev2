# AlpyX: Global Command — Strategic Command 0.40

A browser-based grand-strategy prototype built with React, TypeScript, Zustand, D3 Geo, Dexie and Vitest.

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
