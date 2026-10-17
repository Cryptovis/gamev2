// Phase 9.9: what the Options window shows about the simulation thread, kept in a small store of its own so a stats update
// never re-renders the map or the HUD.

import { create } from 'zustand';
import { FrameMeter, type FrameSummary } from './perfMonitor';
import type { SimStats } from './simulationBridge';

export type SimPreference = 'auto' | 'worker' | 'main';

export interface SimulationView { stats: SimStats | null; frame: FrameSummary | null; preference: SimPreference }
export const useSimulationStats = create<SimulationView>(() => ({ stats: null, frame: null, preference: 'auto' }));

const PUBLISH_EVERY_MS = 250;
let lastPublish = -Infinity;
let queued: SimStats | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/** Publishes at most four times a second; the newest stats always win. */
export function publishStats(stats: SimStats, now: number = Date.now()) {
  queued = stats;
  const wait = lastPublish + PUBLISH_EVERY_MS - now;
  if (wait <= 0) { lastPublish = now; queued = null; useSimulationStats.setState({ stats }); return; }
  if (timer === undefined) timer = setTimeout(() => { timer = undefined; if (queued) { lastPublish = Date.now(); const s = queued; queued = null; useSimulationStats.setState({ stats: s }); } }, wait);
}

/** Test hook: forget any queued publish and start the throttle afresh. */
export function resetStatsPublishing() {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined; queued = null; lastPublish = -Infinity;
}

const meter = new FrameMeter();
let watchers = 0;
let frameTimer: ReturnType<typeof setInterval> | undefined;

/** Measures frame pacing while something (the Options window) is watching. Returns the stop function. */
export function watchFrames(): () => void {
  watchers++;
  if (watchers === 1) {
    meter.reset();
    if (meter.start()) frameTimer = setInterval(() => useSimulationStats.setState({ frame: meter.summary() }), 1000);
  }
  return () => {
    watchers--;
    if (watchers === 0) { meter.stop(); if (frameTimer !== undefined) clearInterval(frameTimer); frameTimer = undefined; }
  };
}
