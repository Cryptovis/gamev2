# Visual Pack 1 Manifest

All assets below are original project SVGs designed for AlpyX Global Command.

## Ministry cards
- `ministry-economy.svg`
- `ministry-defense.svg`
- `ministry-science.svg`
- `ministry-intelligence.svg`
- `ministry-interior.svg`
- `ministry-society.svg`

## Runtime vector icon system
`src/ui/icons/GameIcons.tsx` contains scalable icons for:
- treasury, food, oil, iron, uranium
- approval, industry, fuel, steel, electricity, research
- personnel, tanks, artillery, aircraft, ships
- cabinet, intelligence, interior, society, blocs and global council
- religion glyph family

## Visual direction
Dark strategic-command interface; restrained brass/gold for state authority, cool cyan for systems/data, muted red for military danger, and desaturated slate for background infrastructure. Avoid glossy mobile-game styling and avoid copying any existing game's artwork or UI.


## 0.82.0-playtest.4 native atlas delivery
`resource-atlas.webp`, `civic-atlas-079.webp` and `navigation-atlas.webp` are byte-for-byte extractions of the embedded WebP data in the corresponding existing SVG wrappers. Runtime thumbnails now request these native images directly. Original SVGs remain for compatibility; artwork, tile coordinates and provenance are unchanged. AtlasImage renders a visible decorative fallback if a request fails.

## 0.90.0-playtest.14 sound and battlefield assets (Phase 5)
Original work of RON Interactive, created for Rule of Nations. No recordings, samples, sound libraries or third-party artwork were used. Licence: same as the project's own artwork (original, owned by the project).

### Sound effects — `public/assets/audio/`
Synthesized from sine, sawtooth and seeded noise by [`docs/audio/synthesize_audio.py`](audio/synthesize_audio.py) (numpy/scipy, seed 20261014), encoded with ffmpeg as Opus in WebM (first choice) and MP3 (fallback). Mono, 48 kHz.

| Sound | Files | Channel | Use |
|---|---|---|---|
| UI click | `ui-click.webm`, `ui-click.mp3` | Interface | Buttons, tabs and selectors |
| UI confirm | `ui-confirm.webm`, `ui-confirm.mp3` | Interface | Confirm and commit buttons |
| War alarm | `war-alarm.webm`, `war-alarm.mp3` | Battle | A new war involving the player |
| Radio report | `radio-chirp.webm`, `radio-chirp.mp3` | Battle | A resolved round (one per five rounds at 5×) |
| Artillery fire | `artillery-fire.webm`, `artillery-fire.mp3` | Battle | Recorded bombardment |
| Impact | `impact.webm`, `impact.mp3` | Battle | Bombardment hit |
| Distant impact | `impact-distant.webm`, `impact-distant.mp3` | Battle | Bombardment miss |
| Capture | `capture.webm`, `capture.mp3` | Battle | Objective captured, war won |
| Group lost | `unit-lost.webm`, `unit-lost.mp3` | Battle | Group destroyed, war lost |
| Command ambience | `ambient-command.webm`, `ambient-command.mp3` | Ambience | 24 s loop in peacetime |
| War ambience | `ambient-war.webm`, `ambient-war.mp3` | Ambience | 30 s loop while the player is at war |

### Terrain tiles — `public/assets/terrain/`
Hand-written SVG tiles (48 × 48), one per battlefield terrain: `plains.svg`, `forest.svg`, `mountain.svg`, `desert.svg`, `urban.svg`, `coastal.svg`. Drawn over the earlier CSS gradients, which remain as the fallback; fogged sectors never show terrain.

### Battle effects
Drawn at runtime as inline SVG (`src/ui/panels/BattleFxLayer.tsx`, `src/ui/styles/battleFx.css`); no image files.

### Library
Howler.js 2.2.4 (MIT, © James Simpson / GoldFire Studios), bundled with the app; sounds are created only after the first user interaction.
