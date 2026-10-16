# Phase 9.4 landing contrast record

Ratios are WCAG 2.x contrast, computed from the token values in src/ui/styles/landing094.css and the global Navy and Ivory tokens in appearancePhase7.css. Thresholds: 4.5 for text under 24 px (or 18.66 px bold), 3 for large text and for non-text outlines and focus rings.

## Navy (default)

| Pair | Colours | Ratio |
| --- | --- | --- |
| ink on surface | #eef3f8 on #0e2035 | 14.73 |
| ink on page | #eef3f8 on #091728 | 16.15 |
| muted on page | #b5c7d8 on #091728 | 10.41 |
| muted on surface | #b5c7d8 on #0e2035 | 9.50 |
| muted on raised | #b5c7d8 on #182e46 | 7.99 |
| gold text on page | #e6c866 on #091728 | 11.00 |
| gold text on raised | #e6c866 on #182e46 | 8.44 |
| warning on surface | #ffd9a0 on #0e2035 | 12.29 |
| button text on gold button | #17120a on #d4af37 | 8.86 |
| focus ring on page | #89c6ff on #091728 | 9.95 |
| outline on page | #526c86 on #091728 | 3.30 |
| gold hairline on page | #d4af37 on #091728 | 8.57 |

## Ivory

| Pair | Colours | Ratio |
| --- | --- | --- |
| ink on surface | #142c46 on #fffdf7 | 13.96 |
| ink on page | #142c46 on #e9e7df | 11.47 |
| muted on page | #465b70 on #e9e7df | 5.67 |
| muted on surface | #465b70 on #fffdf7 | 6.90 |
| muted on raised | #465b70 on #f3efe5 | 6.12 |
| gold text on page | #6f5207 on #e9e7df | 5.88 |
| gold text on raised | #6f5207 on #f3efe5 | 6.34 |
| warning on surface | #7a3b00 on #fffdf7 | 8.42 |
| button text on navy button | #ffffff on #183b60 | 11.45 |
| focus ring on page | #145ca5 on #e9e7df | 5.46 |
| outline on page | #667a8c on #e9e7df | 3.59 |
| gold hairline on page | #9a7412 on #e9e7df | 3.47 |

Gold #d4af37 is too light to carry text on Ivory (about 2:1), so Ivory uses #6f5207 for gold text and #9a7412 for hairlines.

## Rendered check

Every visible text node in a sample of all landing classes (hero, dock including a disabled button, save card in its four states, scenarios, drawer, and the hero, compact, loading and outcome widgets) was measured in Chromium in both themes by compositing the computed colour over the computed backgrounds. No text fell below its threshold, and the root had no horizontal overflow at 1440, 1024, 768, 390 and 320 px wide.

## Rendered check with the real components (T11)

The same check was repeated with the real HeroBrand, CommandMenu, SaveGameCard (ready, unreadable and empty), UtilityDock and wisdom widget rendered over the real backdrop (cover art, wash, graticule, vignette), in Navy and Ivory, in English, Chinese and Turkish, at 1440, 1024, 768, 390 and 320 px. For every text node the text was made transparent, the page was captured, and the lightest and darkest background pixel inside the text's box was compared with the text colour, so grid lines and the cover art count against the text. No text fell below 4.5:1 (3:1 for large text), and there was no horizontal overflow. Two things came out of it: the graticule is now masked out behind the text column (strongest at the edges), and the Ivory graticule alphas were lowered.

## Loading screen and shell additions (T14 to T16)

GameLoadingScreen (progress, stage line, gauge, error state) and the rules added for markup that had none (brand block, menu list, segmented control, chip, footer note) were checked with the same worst-pixel method at 1440, 1024, 768, 390 and 320 wide in Navy and Ivory, in English, Chinese and Turkish. No text fell below 4.5:1 (3:1 for large text). Two findings were fixed on the way: the footer note could sit under the decorative frame line when the page scrolls, so it now has a near-opaque chip behind it; and the loading column was top-aligned on narrow screens, so it is centred explicitly. The gauge uses the gold hairline against a track tinted from the ink colour; in forced-colors mode it falls back to Highlight on Canvas.
