# AlpyX Roadmap after 0.31

## Current playable spine
World map → national economy/resources → diplomacy → bilateral commodity flows → development → military conflict → occupation → political consequences.

## 0.32–0.4 priorities
1. Ministries and budget allocation: finance, defense, education/research, interior and foreign affairs.
2. Technology tree with prerequisites and multi-day research rather than instant R&D buttons.
3. Alliance blocs and collective-defense logic.
4. UN v1: sanctions, ceasefire motions, diplomatic reputation and voting influence.
5. Industry chains: crude oil → refined fuel; iron → military/industrial capacity; uranium → reactor/enrichment path.
6. Strategic infrastructure and logistics.

## Later simulation depth
- Religion and ideology as influence networks rather than static labels.
- Internal factions, regime pressure and government legitimacy.
- Nuclear deterrence and escalation.
- Smarter AI strategic goals.
- Web Worker simulation as country count / AI cost rises.
- Cloud saves and optional authoritative multiplayer service.

## Engineering rules
- UI issues typed commands; engine owns simulation rules.
- No `Math.random()` inside simulation: use deterministic seeded RNG.
- Save schema is versioned.
- Features must ship with regression tests.

## 0.40 completed foundations
- Cabinet ministries
- Technology Tree v1
- Processed industrial resources
- Alliance Bloc v1
- Global Council v1
- Visual Pack 1
- GitHub CI / release checklist foundation

## Next candidate: 0.50 Living World
- AI strategic goals and bloc behavior
- Espionage operations and counter-intelligence
- ideology / religion influence propagation
- deeper production chains and military manufacturing
- front geography / terrain / supply routes
- event art expansion and audio foundation
