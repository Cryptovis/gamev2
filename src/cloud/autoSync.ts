// Phase 9.9: automatic upload. After a local autosave, push that campaign to the cloud, at most once a minute, and only
// when the player turned automatic sync on, the project is set up and this profile has a sync key. It only ever pushes a
// campaign this device is ahead on; a conflict or a newer cloud copy is left for the player.

import { readAutoSync } from './cloudConfig';

const MIN_GAP_MS = 60_000;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastRun = -Infinity;
let latest = '';

export function noteLocalSave(campaignId: string | undefined, gapMs: number = MIN_GAP_MS, now: () => number = Date.now): void {
  if (!campaignId || !readAutoSync()) return;
  latest = campaignId;
  if (timer !== undefined) return;
  const wait = Math.max(0, lastRun + gapMs - now());
  timer = setTimeout(async () => {
    timer = undefined; lastRun = now();
    try {
      const control = await import('./cloudControl');
      if (control.isAutoSyncReady()) await control.pushIfAhead(latest);
    } catch { /* offline or not set up: the next autosave tries again */ }
  }, wait);
}

/** Test hook. */
export function resetAutoSync() { if (timer !== undefined) clearTimeout(timer); timer = undefined; lastRun = -Infinity; latest = ''; }
