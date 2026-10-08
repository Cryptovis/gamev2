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
