// Phase 9.9: wires the simulation bridge to the game store and decides, once per environment, whether the daily tick runs in
// a Web Worker or on the main thread.

import { useGameStore } from '../store/gameStore';
import { pickSnapshot } from '../persistence/snapshot';
import { setCommandTap } from './commandTap';
import { WorkerHost, createBrowserWorker } from './hosts';
import type { SimulationHost } from './protocol';
import { SimulationBridge } from './simulationBridge';
import { publishStats, useSimulationStats, type SimPreference } from './simulationStats';

const PREF_KEY = 'ron-sim-mode-v1';

export function readSimPreference(): SimPreference {
  try { const v = localStorage.getItem(PREF_KEY); return v === 'worker' || v === 'main' ? v : 'auto'; } catch { return 'auto'; }
}

export interface SimEnvironment { hasWorker: boolean; headless: boolean }

/**
 * 'main' always ticks on the main thread. 'auto' uses a worker in a real browser and the main thread when there is no Worker
 * or the code runs headless (vitest, which must stay synchronous and deterministic). 'worker' insists whenever a Worker exists.
 */
export function resolveSimulationMode(preference: SimPreference, env: SimEnvironment): 'worker' | 'main' {
  if (preference === 'main' || !env.hasWorker) return 'main';
  if (env.headless && preference === 'auto') return 'main';
  return 'worker';
}

const detectEnvironment = (): SimEnvironment => ({
  hasWorker: typeof Worker === 'function',
  headless: typeof window === 'undefined' || import.meta.env?.MODE === 'test',
});

let preference: SimPreference = readSimPreference();
let bridge: SimulationBridge | null = null;
let injected = false;
useSimulationStats.setState({ preference });

function tearDown() { setCommandTap(null); bridge?.dispose(); bridge = null; injected = false; }

function create(host: SimulationHost): SimulationBridge {
  const made = new SimulationBridge({
    host,
    getState: () => pickSnapshot(useGameStore.getState()),
    commit: partial => useGameStore.setState(partial),
    directTick: () => useGameStore.getState().advanceDay(),
    onStats: stats => publishStats(stats),
  });
  setCommandTap((prev, next, command) => made.recordCommand(prev, next, command));
  publishStats(made.stats);
  return made;
}

/** The bridge for the current preference, or null when ticks run directly on the main thread. */
export function currentBridge(env: SimEnvironment = detectEnvironment()): SimulationBridge | null {
  if (injected) return bridge;
  const wanted = resolveSimulationMode(preference, env);
  if (wanted === 'main') { if (bridge) tearDown(); return null; }
  if (!bridge) {
    try { bridge = create(new WorkerHost(createBrowserWorker)); }
    catch { bridge = null; preference = 'main'; useSimulationStats.setState({ preference }); return null; }
  }
  return bridge;
}

/** One clock beat: the worker when there is one, otherwise today's synchronous path. */
export function tickClockDay(): void {
  const active = currentBridge();
  if (active) active.requestTick();
  else useGameStore.getState().advanceDay();
}

export function setSimulationPreference(next: SimPreference): void {
  preference = next;
  try { localStorage.setItem(PREF_KEY, next); } catch { /* storage blocked: the choice lasts until reload */ }
  useSimulationStats.setState({ preference: next, stats: null });
  if (next === 'main' && bridge) tearDown();
}

/** Test hook: run the clock through a bridge built by the test (for example on a MainThreadHost). */
export function installBridgeForTests(host: SimulationHost | null): SimulationBridge | null {
  tearDown();
  if (!host) return null;
  bridge = create(host); injected = true;
  return bridge;
}
