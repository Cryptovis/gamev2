#!/usr/bin/env node
/**
 * playtest.17 (Phase 6.3): one-off conversion of Natural Earth "Gray Earth with Shaded Relief, Hypsography, Ocean Bottom
 * and Drainages" (GRAY_50M_SR_OB, public domain, 10800×5400 equirectangular GeoTIFF) into the committed hillshade texture
 * `public/assets/geography/hillshade-2048.webp` (2048×1024, same frame as the Blue Marble surface).
 *
 * Usage (sharp is not a project dependency; use a global install):
 *   NODE_PATH="$(npm root -g)" node scripts/build-hillshade.mjs path/to/GRAY_50M_SR_OB.tif [out.webp]
 *
 * Source: https://naciscdn.org/naturalearth/50m/raster/GRAY_50M_SR_OB.zip
 */
import { createRequire } from 'node:module';
import { statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url); // honours NODE_PATH, unlike ESM `import`
let sharp;
try { sharp = require('sharp'); } catch { console.error('sharp not found. Install it globally and run with NODE_PATH="$(npm root -g)".'); process.exit(2); }

const WIDTH = 2048, HEIGHT = 1024;
const BLACK = 40, WHITE = 230;   // levels: BLACK→0, WHITE→255, so flat land sits near mid-grey
const QUALITY = 82;
const MAX_BYTES = 450 * 1024;

const here = path.dirname(fileURLToPath(import.meta.url));
const input = process.argv[2];
const output = process.argv[3] ?? path.resolve(here, '../public/assets/geography/hillshade-2048.webp');
if (!input) { console.error('Usage: node scripts/build-hillshade.mjs <GRAY_50M_SR_OB.tif> [out.webp]'); process.exit(1); }

const gain = 255 / (WHITE - BLACK);
await sharp(input, { limitInputPixels: false })
  .greyscale()
  .resize(WIDTH, HEIGHT, { fit: 'fill', kernel: 'lanczos3' })
  .linear(gain, -BLACK * gain)
  .webp({ quality: QUALITY, smartSubsample: false })
  .toFile(output);

const bytes = statSync(output).size;
console.log(`${path.relative(process.cwd(), output)}: ${WIDTH}×${HEIGHT}, ${(bytes / 1024).toFixed(0)} kB`);
if (bytes > MAX_BYTES) { console.warn(`Larger than the ${MAX_BYTES / 1024} kB target; lower QUALITY and rebuild.`); process.exitCode = 3; }
