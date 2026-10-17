import { describe, expect, it, vi, afterEach } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import type { GameCommand } from '../domain/commands';
import { executeCommandResult } from '../engine/commands';
import { MainThreadHost, WorkerHost, type WorkerLike } from '../sim/hosts';
import { PROTOCOL_VERSION, type SimRequest, type SimResponse } from '../sim/protocol';
import { FrameMeter, FRAME_BUDGET_MS, LONG_FRAME_MS, RollingWindow } from '../sim/perfMonitor';
import { SimulationBridge } from '../sim/simulationBridge';
import { SimulationCore } from '../sim/simulationCore';
import { GAME_KEYS, SIM_KEYS, UI_KEYS, applyPatch, diffState, patchIsEmpty, patchKeys, simKeysEqual, stateDigest } from '../sim/stateSync';
import { noteCommand, setCommandTap } from '../sim/commandTap';
import { installBridgeForTests, readSimPreference, resolveSimulationMode, setSimulationPreference, tickClockDay } from '../sim/storeSimulation';
import { publishStats, resetStatsPublishing, useSimulationStats } from '../sim/simulationStats';
import { useGameStore } from '../store/gameStore';

const mockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
};
vi.stubGlobal('localStorage', mockStorage());

/** A fresh campaign that will not stop for an event or an advisor during the few days a test plays. */
const base = (): GameState => {
  const s = makeInitialState();
  s.world.tutorial.active = false;
  s.eventCooldownUntil = 100000;
  s.advisorCooldownUntil = 100000;
  return s;
};
const tick = (s: GameState) => executeCommandResult(s, { type: 'time/advanceDay' }).state;
const run = (s: GameState, command: GameCommand) => executeCommandResult(s, command).state;
const days = (s: GameState, n: number) => { let x = s; for (let i = 0; i < n; i++) x = tick(x); return x; };
/** Two states are equal when their digest and every field agree. */
const same = (a: GameState, b: GameState) => { expect(stateDigest(a)).toBe(stateDigest(b)); expect(a).toEqual(b); };
const TAX = (rate: number): GameCommand => ({ type: 'economy/setTaxRate', rate });
const taxOf = (s: GameState) => s.countries[s.playerCountryId].economy.taxRate;

describe('9.9 state sync: keys, patches and the digest', () => {
  it('lists every key of the game state, so no field can be left out of a patch', () => {
    expect([...GAME_KEYS].sort()).toEqual(Object.keys(base()).sort());
    expect(SIM_KEYS.length).toBe(GAME_KEYS.length - UI_KEYS.length);
    for (const k of UI_KEYS) expect(SIM_KEYS.includes(k)).toBe(false);
  });

  it('describes a whole day as a patch that rebuilds the next state exactly', () => {
    const before = base(), after = tick(before);
    const patch = diffState(before, after);
    expect(patchIsEmpty(patch)).toBe(false);
    same(applyPatch(before, patch), after);
  });

  it('survives structured cloning, which is how a worker returns it', () => {
    const before = base(), after = tick(before);
    same(applyPatch(before, structuredClone(diffState(before, after))), after);
  });

  it('is empty for identical states and names only what changed', () => {
    const s = base();
    expect(patchIsEmpty(diffState(s, s))).toBe(true);
    const id = s.playerCountryId;
    const next = { ...s, countries: { ...s.countries, [id]: { ...s.countries[id], economy: { ...s.countries[id].economy, treasury: s.countries[id].economy.treasury + 1 } } } };
    const patch = diffState(s, next);
    expect(patch.set.length).toBe(1);
    expect(patch.set[0][0]).toBe('countries');
    expect(patch.set[0][1]).toBe(id);
    expect([...patchKeys(patch)]).toEqual(['countries']);
  });

  it('carries added and removed entries and replaces arrays whole', () => {
    const s = base();
    const next = { ...s, sitrep: ['one'], world: { ...s.world, nuclear: undefined, extra: 5 } } as unknown as GameState;
    const withExtra = { ...s, world: { ...s.world, extra: 5 } } as unknown as GameState;
    const removed = diffState(withExtra, s);
    expect(removed.del).toEqual([['world', 'extra']]);
    expect('extra' in applyPatch(withExtra, removed).world).toBe(false);
    const patch = diffState(s, next);
    expect(patch.set.some(([k, sub]) => k === 'sitrep' && sub === null)).toBe(true);
    expect(patch.set.some(([k, sub]) => k === 'world' && sub === 'extra')).toBe(true);
  });

  it('keeps the identity of every entry a patch does not touch', () => {
    const s = base();
    const id = s.playerCountryId, other = Object.keys(s.countries).find(k => k !== id)!;
    const next = { ...s, countries: { ...s.countries, [id]: { ...s.countries[id] } } };
    const out = applyPatch(s, diffState(s, next));
    expect(out.countries[other]).toBe(s.countries[other]);
    expect(out.countries[id]).toBe(next.countries[id]);
    expect(out.wars).toBe(s.wars);
    expect(s.countries[id]).not.toBe(out.countries[id]);
  });

  it('compares only simulation keys by reference', () => {
    const s = base();
    expect(simKeysEqual(s, { ...s })).toBe(true);
    expect(simKeysEqual(s, { ...s, selectedCountryId: 'FRA', mapNotice: 'x', mapMode: 'trade' as GameState['mapMode'] })).toBe(true);
    expect(simKeysEqual(s, { ...s, countries: { ...s.countries } })).toBe(false);
    expect(simKeysEqual(s, { ...s, speed: 3 })).toBe(false);
  });

  it('gives equal states equal digests and different states different ones', () => {
    const s = base();
    expect(stateDigest(s)).toBe(stateDigest(structuredClone(s)));
    expect(stateDigest(s)).toMatch(/^[0-9a-f]{8}$/);
    const id = s.playerCountryId;
    const richer = { ...s, countries: { ...s.countries, [id]: { ...s.countries[id], economy: { ...s.countries[id].economy, treasury: s.countries[id].economy.treasury + 5 } } } };
    expect(stateDigest(richer)).not.toBe(stateDigest(s));
    expect(stateDigest(tick(s))).not.toBe(stateDigest(s));
    expect(stateDigest({ ...s, selectedCountryId: 'FRA' })).toBe(stateDigest(s));
  });
});

describe('9.9 the simulation core is the same code the main thread runs', () => {
  const load = (core: SimulationCore, state: GameState, epoch = 1) => core.handle({ type: 'load', epoch, state });
  const batch = (core: SimulationCore, state: GameState, id: number, commands: GameCommand[], ticks = 1, epoch = 1): SimResponse =>
    core.handle({ type: 'batch', epoch, id, commands, ticks, selectedCountryId: state.selectedCountryId, expectDigest: stateDigest(commands.reduce(run, state)) });

  it('says hello with the protocol version and answers pings', () => {
    const core = new SimulationCore();
    expect(core.hello()).toEqual({ type: 'ready', version: PROTOCOL_VERSION });
    expect(core.handle({ type: 'ping', id: 7 })).toEqual({ type: 'pong', id: 7 });
  });

  it('computes a day whose patch equals the main thread day', () => {
    const core = new SimulationCore(), s = base();
    expect(load(core, s)).toEqual({ type: 'loaded', epoch: 1, digest: stateDigest(s) });
    const r = batch(core, s, 1, []);
    expect(r.type === 'result' && r.status).toBe('ok');
    if (r.type !== 'result' || r.status !== 'ok') return;
    expect(r.ticksRun).toBe(1);
    same(applyPatch(s, r.patch), tick(s));
    expect(r.postDigest).toBe(stateDigest(tick(s)));
  });

  it('plays several days to the same state as the main thread, patch after patch', () => {
    const core = new SimulationCore(), start = base();
    load(core, start);
    let ui = start;
    for (let i = 1; i <= 6; i++) {
      const r = batch(core, ui, i, []);
      if (r.type !== 'result' || r.status !== 'ok') throw new Error('expected a result');
      ui = applyPatch(ui, structuredClone(r.patch));
    }
    same(ui, days(start, 6));
  });

  it('applies queued commands in order before the day', () => {
    const core = new SimulationCore(), s = base();
    load(core, s);
    const commands = [TAX(12), TAX(17)];
    const r = batch(core, s, 1, commands);
    if (r.type !== 'result' || r.status !== 'ok') throw new Error('expected a result');
    expect(r.commandsApplied).toBe(2);
    const expected = tick(commands.reduce(run, s));
    same(applyPatch(commands.reduce(run, s), r.patch), expected);
    expect(taxOf(core.state!)).toBe(taxOf(expected));
  });

  it('runs more than one day per batch and stops when a decision holds the clock', () => {
    const core = new SimulationCore(), s = base();
    load(core, s);
    const three = batch(core, s, 1, [], 3);
    if (three.type !== 'result' || three.status !== 'ok') throw new Error('expected a result');
    expect(three.ticksRun).toBe(3);
    same(applyPatch(s, three.patch), days(s, 3));
    const held = { ...s, campaignStatus: 'lost' as const };
    load(core, held, 2);
    const none = batch(core, held, 2, [], 3, 2);
    if (none.type !== 'result' || none.status !== 'ok') throw new Error('expected a result');
    expect(none.ticksRun).toBe(0);
  });

  it('refuses to tick when its mirror disagrees with the interface, and asks for a reload', () => {
    const core = new SimulationCore(), s = base();
    load(core, s);
    const r = core.handle({ type: 'batch', epoch: 1, id: 1, commands: [], ticks: 1, selectedCountryId: s.selectedCountryId, expectDigest: 'deadbeef' });
    expect(r).toMatchObject({ type: 'result', status: 'diverged', workerDigest: stateDigest(s) });
    expect(batch(core, s, 2, [])).toMatchObject({ type: 'result', status: 'no-mirror' });
  });

  it('ignores a batch from another epoch or before any load', () => {
    const core = new SimulationCore(), s = base();
    expect(batch(core, s, 1, [])).toMatchObject({ status: 'no-mirror' });
    load(core, s, 5);
    expect(batch(core, s, 2, [], 1, 4)).toMatchObject({ status: 'no-mirror', epoch: 4 });
    expect(batch(core, s, 3, [], 1, 5)).toMatchObject({ status: 'ok' });
  });

  it('reports a failure as an error message and drops the mirror instead of throwing', () => {
    const core = new SimulationCore(), s = base();
    expect(load(core, {} as unknown as GameState).type).toBe('error');
    expect(core.state).toBeNull();
    // A state whose day cannot be computed (the digest does not read leadership, the tick does).
    const broken = { ...s, leadership: undefined } as unknown as GameState;
    expect(load(core, broken, 2).type).toBe('loaded');
    const r = core.handle({ type: 'batch', epoch: 2, id: 1, commands: [], ticks: 1, selectedCountryId: s.selectedCountryId, expectDigest: stateDigest(broken) });
    expect(r.type).toBe('error');
    expect(r).toMatchObject({ epoch: 2, id: 1 });
    expect(core.state).toBeNull();
    expect(batch(core, s, 2, [], 1, 2)).toMatchObject({ status: 'no-mirror' });
  });

  it('measures its own work with the clock it is given', () => {
    let t = 0;
    const core = new SimulationCore(() => (t += 10)), s = base();
    load(core, s);
    const r = batch(core, s, 1, [TAX(11)]);
    if (r.type !== 'result' || r.status !== 'ok') throw new Error('expected a result');
    expect(r.timings.commandsMs).toBe(10);
    expect(r.timings.tickMs).toBe(10);
    expect(r.timings.diffMs).toBe(10);
  });

  it('takes the selected country from the interface, since integration may rewrite it', () => {
    const core = new SimulationCore(), s = base();
    load(core, s);
    const r = core.handle({ type: 'batch', epoch: 1, id: 1, commands: [], ticks: 0, selectedCountryId: 'FRA', expectDigest: stateDigest({ ...s, selectedCountryId: 'FRA' }) });
    expect(r).toMatchObject({ status: 'ok', ticksRun: 0 });
    expect(core.state!.selectedCountryId).toBe('FRA');
  });
});

describe('9.9 hosts', () => {
  const fakeWorker = () => {
    const listeners: Record<string, ((e: never) => void)[]> = {};
    const sent: unknown[] = [];
    const worker: WorkerLike & { emit(type: string, data: unknown): void; terminated: boolean } = {
      terminated: false,
      postMessage: (m: unknown) => { sent.push(m); },
      addEventListener: ((type: string, l: (e: never) => void) => { (listeners[type] ??= []).push(l); }) as WorkerLike['addEventListener'],
      terminate() { this.terminated = true; },
      emit(type, data) { for (const l of listeners[type] ?? []) l(data as never); },
    };
    return { worker, sent };
  };

  it('a worker host forwards requests, replies and failures', () => {
    const { worker, sent } = fakeWorker();
    const host = new WorkerHost(() => worker);
    const seen: SimResponse[] = [];
    const off = host.listen(m => seen.push(m));
    host.post({ type: 'ping', id: 1 });
    expect(sent).toEqual([{ type: 'ping', id: 1 }]);
    worker.emit('message', { data: { type: 'pong', id: 1 } });
    worker.emit('error', { message: 'boom' });
    worker.emit('messageerror', {});
    expect(seen).toEqual([{ type: 'pong', id: 1 }, { type: 'error', message: 'boom' }, { type: 'error', message: 'The simulation worker failed.' }]);
    off();
    worker.emit('message', { data: { type: 'pong', id: 2 } });
    expect(seen.length).toBe(3);
    host.terminate();
    expect(worker.terminated).toBe(true);
    expect(host.kind).toBe('worker');
  });

  it('a main-thread host answers asynchronously, like a worker would', async () => {
    const host = new MainThreadHost();
    const seen: SimResponse[] = [];
    host.listen(m => seen.push(m));
    host.post({ type: 'ping', id: 3 });
    expect(seen.length).toBe(0);
    await Promise.resolve();
    expect(seen).toEqual([{ type: 'ready', version: PROTOCOL_VERSION }, { type: 'pong', id: 3 }]);
    expect(host.kind).toBe('main');
  });

  it('a manual main-thread host holds replies until flushed and goes quiet when terminated', () => {
    const host = new MainThreadHost(true);
    const seen: SimResponse[] = [];
    host.listen(m => seen.push(m));
    host.post({ type: 'ping', id: 1 });
    expect(host.pending).toBe(2);
    host.flush();
    expect(seen.length).toBe(2);
    host.terminate();
    host.post({ type: 'ping', id: 2 });
    host.flush();
    expect(seen.length).toBe(2);
  });
});

/** A host the test drives by hand: it records what the bridge posts and answers only when told to. */
function scripted() {
  const handlers = new Set<(m: SimResponse) => void>();
  const posted: SimRequest[] = [];
  const state = { terminated: false };
  const host = {
    kind: 'worker' as const,
    post: (m: SimRequest) => { posted.push(m); },
    listen: (h: (m: SimResponse) => void) => { handlers.add(h); return () => { handlers.delete(h); }; },
    terminate: () => { state.terminated = true; handlers.clear(); },
  };
  return {
    posted, host,
    get terminated() { return state.terminated; },
    emit: (m: SimResponse) => { for (const h of [...handlers]) h(m); },
    make(options: { maxDivergences?: number; start?: GameState }) {
      const store = { state: options.start ?? base() };
      const direct = vi.fn(() => { store.state = tick(store.state); });
      const bridge = new SimulationBridge({ host, getState: () => store.state, commit: p => { store.state = { ...store.state, ...p }; }, directTick: direct, maxDivergences: options.maxDivergences });
      return { store, direct, bridge };
    },
  };
}

describe('9.9 the bridge keeps the interface and the worker in step', () => {
  function rig(options: { start?: GameState; now?: () => number; maxDivergences?: number } = {}) {
    const store = { state: options.start ?? base() };
    const host = new MainThreadHost(true);
    const direct = vi.fn(() => { store.state = tick(store.state); });
    const commits: string[][] = [];
    const bridge = new SimulationBridge({
      host, getState: () => store.state, commit: partial => { commits.push(Object.keys(partial)); store.state = { ...store.state, ...partial }; },
      directTick: direct, now: options.now, maxDivergences: options.maxDivergences,
    });
    /** A player command: applied at once, reported to the bridge. */
    const apply = (command: GameCommand) => { const prev = store.state, next = run(prev, command); bridge.recordCommand(prev, next, command); store.state = next; };
    const start = () => { host.flush(); };
    return { store, host, bridge, direct, apply, start, commits };
  }

  it('ticks on the main thread until the worker has said hello', () => {
    const r = rig();
    expect(r.bridge.stats.status).toBe('starting');
    expect(r.bridge.requestTick()).toBe('direct');
    expect(r.direct).toHaveBeenCalledTimes(1);
    r.start();
    expect(r.bridge.stats.status).toBe('running');
    expect(r.bridge.requestTick()).toBe('dispatched');
  });

  it('computes a day in the worker and commits it to the store', () => {
    const r = rig(), start = r.store.state;
    r.start();
    expect(r.bridge.requestTick()).toBe('dispatched');
    expect(r.store.state.day).toBe(start.day);
    expect(r.bridge.stats.inFlight).toBe(true);
    r.host.flush();
    same(r.store.state, tick(start));
    expect(r.bridge.stats.completed).toBe(1);
    expect(r.bridge.stats.inFlight).toBe(false);
    expect(r.direct).toHaveBeenCalledTimes(0);
  });

  it('plays several days to exactly the main-thread result without a single resync', () => {
    const r = rig(), start = r.store.state;
    r.start();
    for (let i = 0; i < 5; i++) { r.bridge.requestTick(); r.host.flush(); }
    same(r.store.state, days(start, 5));
    expect(r.bridge.stats.completed).toBe(5);
    expect(r.bridge.stats.resyncs).toBe(0);
    expect(r.bridge.stats.divergences).toBe(0);
    expect(r.bridge.stats.conflicts).toBe(0);
  });

  it('drops a clock beat while the previous day is still being computed', () => {
    const r = rig();
    r.start();
    expect(r.bridge.requestTick()).toBe('dispatched');
    expect(r.bridge.requestTick()).toBe('skipped');
    expect(r.bridge.requestTick()).toBe('skipped');
    expect(r.bridge.stats.skipped).toBe(2);
    r.host.flush();
    expect(r.bridge.requestTick()).toBe('dispatched');
  });

  it('queues the commands the player issues and sends them with the next dispatch', () => {
    const r = rig();
    r.start();
    r.bridge.requestTick(); r.host.flush();
    const synced = r.store.state;
    r.apply(TAX(13));
    r.apply(TAX(16));
    expect(r.bridge.stats.queueDepth).toBe(2);
    r.bridge.requestTick();
    expect(r.bridge.stats.queueDepth).toBe(0);
    r.host.flush();
    same(r.store.state, tick(run(run(synced, TAX(13)), TAX(16))));
    expect(taxOf(r.host.core.state!)).toBe(taxOf(r.store.state));
    expect(r.bridge.stats.resyncs).toBe(0);
  });

  it('needs no queue before the first dispatch, because the first dispatch sends the whole state', () => {
    const r = rig(), start = r.store.state;
    r.start();
    r.apply(TAX(13));
    expect(r.bridge.stats.queueDepth).toBe(0);
    r.bridge.requestTick(); r.host.flush();
    same(r.store.state, tick(run(start, TAX(13))));
  });

  it('does not queue a command that changed nothing', () => {
    const r = rig();
    r.start();
    const state = r.store.state;
    r.bridge.recordCommand(state, state, TAX(1));
    expect(r.bridge.stats.queueDepth).toBe(0);
  });

  it('puts what the player did while a day was computed after that day, in order', () => {
    const r = rig(), start = r.store.state;
    r.start();
    r.bridge.requestTick();
    r.apply(TAX(14));
    r.apply(TAX(18));
    expect(r.bridge.stats.queueDepth).toBe(2);
    r.host.flush();
    same(r.store.state, run(run(tick(start), TAX(14)), TAX(18)));
    expect(r.bridge.stats.queueDepth).toBe(2);
    r.bridge.requestTick();
    r.host.flush();
    same(r.store.state, tick(run(run(tick(start), TAX(14)), TAX(18))));
    expect(r.bridge.stats.divergences).toBe(0);
    expect(r.bridge.stats.resyncs).toBe(0);
  });

  it('reloads the worker when the state changed behind the bridge, then plays on from the new state', () => {
    const r = rig();
    r.start();
    r.bridge.requestTick(); r.host.flush();
    const id = r.store.state.playerCountryId, c = r.store.state.countries[id];
    r.store.state = { ...r.store.state, countries: { ...r.store.state.countries, [id]: { ...c, economy: { ...c.economy, treasury: c.economy.treasury + 100 } } } };
    const expected = tick(r.store.state);
    r.bridge.requestTick(); r.host.flush();
    same(r.store.state, expected);
    expect(r.bridge.stats.resyncs).toBe(1);
    expect(r.bridge.stats.divergences).toBe(0);
  });

  it('drops a day whose state was changed behind its back while it was in flight', () => {
    const r = rig();
    r.start();
    r.bridge.requestTick();
    const loaded = base(); loaded.day += 40;
    r.store.state = loaded;
    r.host.flush();
    expect(r.store.state).toBe(loaded);
    expect(r.bridge.stats.conflicts).toBe(1);
    const expected = tick(loaded);
    r.bridge.requestTick(); r.host.flush();
    same(r.store.state, expected);
    expect(r.bridge.stats.resyncs).toBe(1);
  });

  it('lets the interface move the map selection while a day is computed without calling it a conflict', () => {
    const r = rig();
    r.start();
    r.bridge.requestTick();
    r.store.state = { ...r.store.state, selectedCountryId: 'FRA', mapNotice: 'hello' };
    r.host.flush();
    expect(r.bridge.stats.conflicts).toBe(0);
    expect(r.store.state.selectedCountryId).toBe('FRA');
    expect(r.store.state.mapNotice).toBe('hello');
    expect(r.bridge.stats.completed).toBe(1);
  });

  it('writes only the keys the day changed, so untouched parts keep their identity', () => {
    const r = rig(), start = r.store.state;
    r.start();
    r.bridge.requestTick(); r.host.flush();
    expect(r.commits[0].includes('day')).toBe(true);
    expect(r.commits[0].includes('mapMode')).toBe(false);
    expect(r.commits[0].includes('playerCountryId')).toBe(false);
    expect(r.store.state.playerProfile).toBe(start.playerProfile);
  });

  it('notices a diverged mirror, reloads, and keeps playing', () => {
    const r = rig();
    r.start();
    r.bridge.requestTick(); r.host.flush();
    const mirror = r.host.core.state!, id = mirror.playerCountryId;
    r.host.core.handle({ type: 'load', epoch: 1, state: { ...mirror, countries: { ...mirror.countries, [id]: { ...mirror.countries[id], economy: { ...mirror.countries[id].economy, gdp: 1 } } } } });
    r.host.flush();
    const dayBefore = r.store.state.day;
    r.bridge.requestTick(); r.host.flush();
    expect(r.bridge.stats.divergences).toBe(1);
    expect(r.store.state.day).toBe(dayBefore);
    r.bridge.requestTick(); r.host.flush();
    expect(r.store.state.day).toBe(dayBefore + 1);
    expect(r.bridge.stats.status).toBe('running');
  });

  it('gives up on a worker that keeps diverging and ticks on the main thread from then on', () => {
    const h = scripted(), t = h.make({ maxDivergences: 3 });
    h.emit({ type: 'ready', version: PROTOCOL_VERSION });
    for (let i = 1; i <= 3; i++) {
      expect(t.bridge.requestTick()).toBe('dispatched');
      const batch = h.posted.filter(m => m.type === 'batch').at(-1) as Extract<SimRequest, { type: 'batch' }>;
      h.emit({ type: 'result', epoch: batch.epoch, id: batch.id, status: 'diverged', workerDigest: 'x' });
    }
    expect(t.bridge.stats.divergences).toBe(3);
    expect(t.bridge.stats.status).toBe('degraded');
    expect(t.bridge.stats.reason).toContain('diverging');
    expect(h.terminated).toBe(true);
    expect(t.bridge.requestTick()).toBe('direct');
    expect(t.direct).toHaveBeenCalledTimes(1);
  });

  it('rejects a result whose digest does not match the patched state', () => {
    const h = scripted(), t = h.make({}), before = t.store.state;
    h.emit({ type: 'ready', version: PROTOCOL_VERSION });
    t.bridge.requestTick();
    const batch = h.posted.filter(m => m.type === 'batch').at(-1) as Extract<SimRequest, { type: 'batch' }>;
    const good = tick(before);
    h.emit({ type: 'result', epoch: batch.epoch, id: batch.id, status: 'ok', patch: diffState(before, good), postDigest: 'badbad00', ticksRun: 1, commandsApplied: 0, timings: { commandsMs: 0, tickMs: 1, diffMs: 0 } });
    expect(t.store.state).toBe(before);
    expect(t.bridge.stats.divergences).toBe(1);
    expect(t.bridge.stats.completed).toBe(0);
    expect(t.bridge.requestTick()).toBe('dispatched');
    expect(h.posted.filter(m => m.type === 'load').length).toBe(2);
  });

  it('degrades for good when the worker reports an error', () => {
    const h = scripted(), t = h.make({});
    h.emit({ type: 'ready', version: PROTOCOL_VERSION });
    t.bridge.requestTick();
    h.emit({ type: 'error', message: 'out of memory' });
    expect(t.bridge.stats.status).toBe('degraded');
    expect(t.bridge.stats.reason).toBe('out of memory');
    expect(t.bridge.stats.inFlight).toBe(false);
    expect(h.terminated).toBe(true);
    expect(t.bridge.requestTick()).toBe('direct');
    expect(t.direct).toHaveBeenCalledTimes(1);
  });

  it('falls back to the main thread when the worker never says hello', () => {
    let t = 0;
    const r = rig({ now: () => t });
    t = 1000;
    expect(r.bridge.requestTick()).toBe('direct');
    expect(r.bridge.stats.status).toBe('starting');
    t = 5000;
    expect(r.bridge.requestTick()).toBe('direct');
    expect(r.bridge.stats.status).toBe('degraded');
    expect(r.bridge.stats.mode).toBe('direct');
    expect(r.bridge.stats.reason).toContain('did not start');
    expect(r.direct).toHaveBeenCalledTimes(2);
  });

  it('falls back when a day never comes back', () => {
    let t = 0;
    const r = rig({ now: () => t });
    r.start();
    r.bridge.requestTick();
    t = 14000;
    expect(r.bridge.requestTick()).toBe('skipped');
    t = 16000;
    expect(r.bridge.requestTick()).toBe('direct');
    expect(r.bridge.stats.status).toBe('degraded');
    expect(r.bridge.stats.reason).toContain('stopped answering');
  });

  it('ignores an answer to a request it has already abandoned', () => {
    const r = rig();
    r.start();
    r.bridge.requestTick();
    const loaded = base(); loaded.day += 10;
    r.store.state = loaded;
    r.host.flush();
    expect(r.bridge.stats.conflicts).toBe(1);
    // A late duplicate of the same answer must not be applied to the new state.
    r.host.flush();
    expect(r.store.state).toBe(loaded);
  });

  it('reports timings and counters for the indicator', () => {
    const r = rig();
    r.start();
    for (let i = 0; i < 3; i++) { r.bridge.requestTick(); r.host.flush(); }
    const s = r.bridge.stats;
    expect(s.mode).toBe('main');
    expect(s.dispatched).toBe(3);
    expect(s.tickMs.count).toBe(3);
    expect(s.roundTripMs.count).toBe(3);
    expect(s.applyMs.count).toBe(3);
    expect(s.tickMs.max).toBeGreaterThanOrEqual(s.tickMs.p50);
  });

  it('stops listening and shuts the host down when disposed', () => {
    const r = rig();
    r.start();
    r.bridge.dispose();
    expect(r.bridge.stats.status).toBe('stopped');
    expect(r.bridge.stats.mode).toBe('direct');
    expect(r.bridge.requestTick()).toBe('direct');
  });
});

describe('9.9 wiring to the store', () => {
  afterEach(() => { installBridgeForTests(null); setCommandTap(null); try { localStorage.removeItem('ron-sim-mode-v1'); } catch { /* none */ } });

  it('chooses where the tick runs', () => {
    expect(resolveSimulationMode('main', { hasWorker: true, headless: false })).toBe('main');
    expect(resolveSimulationMode('auto', { hasWorker: true, headless: false })).toBe('worker');
    expect(resolveSimulationMode('auto', { hasWorker: false, headless: false })).toBe('main');
    expect(resolveSimulationMode('auto', { hasWorker: true, headless: true })).toBe('main');
    expect(resolveSimulationMode('worker', { hasWorker: true, headless: true })).toBe('worker');
    expect(resolveSimulationMode('worker', { hasWorker: false, headless: false })).toBe('main');
  });

  it('remembers the preference and ignores junk', () => {
    expect(readSimPreference()).toBe('auto');
    setSimulationPreference('main');
    expect(readSimPreference()).toBe('main');
    expect(useSimulationStats.getState().preference).toBe('main');
    localStorage.setItem('ron-sim-mode-v1', 'turbo');
    expect(readSimPreference()).toBe('auto');
    setSimulationPreference('auto');
  });

  it('passes a command through the tap exactly once and only when something changed', () => {
    const calls: string[] = [];
    setCommandTap((_p, _n, c) => { calls.push(c.type); });
    const s = base(), changed = { ...s, day: s.day + 1 };
    expect(noteCommand(s, changed, TAX(5))).toBe(changed);
    expect(noteCommand(s, s, TAX(6))).toBe(s);
    expect(calls).toEqual(['economy/setTaxRate']);
  });

  it('runs the clock through the bridge when one is installed, and directly otherwise', async () => {
    const start = base();
    useGameStore.setState(start);
    const advance = vi.fn();
    useGameStore.setState({ advanceDay: advance } as never);
    tickClockDay();
    expect(advance).toHaveBeenCalledTimes(1);
    const host = new MainThreadHost(true);
    const bridge = installBridgeForTests(host)!;
    host.flush();
    tickClockDay();
    expect(advance).toHaveBeenCalledTimes(1);
    expect(bridge.stats.dispatched).toBe(1);
    host.flush();
    expect(useGameStore.getState().day).toBe(start.day + 1);
  });
});

describe('9.9 performance meters', () => {
  it('keeps a rolling window and reports percentiles', () => {
    const w = new RollingWindow(5);
    expect(w.summary()).toEqual({ count: 0, last: 0, mean: 0, p50: 0, p95: 0, max: 0 });
    for (const v of [10, 20, 30, 40, 50, 60, 70]) w.push(v);
    const s = w.summary();
    expect(s.count).toBe(5);
    expect(s.last).toBe(70);
    expect(s.max).toBe(70);
    expect(s.p50).toBe(50);
    expect(s.p95).toBe(70);
    expect(s.mean).toBe(50);
    w.push(NaN);
    expect(w.summary().count).toBe(5);
    w.clear();
    expect(w.summary().count).toBe(0);
  });

  it('measures a steady 60 FPS and counts a stutter', () => {
    const m = new FrameMeter();
    let t = 1000;
    m.record(t);
    for (let i = 0; i < 60; i++) { t += FRAME_BUDGET_MS; m.record(t); }
    expect(m.summary().fps).toBe(60);
    expect(m.summary().longFrames).toBe(0);
    t += 120; m.record(t);
    expect(m.summary().longFrames).toBe(1);
    expect(m.summary().worstMs).toBeGreaterThan(LONG_FRAME_MS);
    expect(m.summary().frames).toBe(61);
  });

  it('does not count a hidden tab as a stutter', () => {
    const m = new FrameMeter();
    m.record(0); m.record(16); m.record(8000); m.record(8016);
    expect(m.summary().longFrames).toBe(0);
    expect(m.summary().frames).toBe(2);
    m.reset();
    expect(m.summary().frames).toBe(0);
  });

  it('only starts where there is a frame clock', () => {
    const had = (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame;
    vi.stubGlobal('requestAnimationFrame', undefined);
    expect(new FrameMeter().start()).toBe(false);
    vi.unstubAllGlobals();
    if (had) expect(typeof requestAnimationFrame).toBe('function');
  });

  it('publishes stats at most four times a second', () => {
    resetStatsPublishing();
    vi.useFakeTimers();
    const stats = (completed: number) => ({ completed } as never);
    useSimulationStats.setState({ stats: null });
    const t0 = Date.now() + 60_000;
    publishStats(stats(1), t0);
    expect((useSimulationStats.getState().stats as unknown as { completed: number }).completed).toBe(1);
    publishStats(stats(2), t0 + 50);
    publishStats(stats(3), t0 + 100);
    expect((useSimulationStats.getState().stats as unknown as { completed: number }).completed).toBe(1);
    vi.advanceTimersByTime(400);
    expect((useSimulationStats.getState().stats as unknown as { completed: number }).completed).toBe(3);
    vi.useRealTimers();
    resetStatsPublishing();
  });
});

describe('9.9 the worker stays free of the page', () => {
  const sources = import.meta.glob<string>(['../sim/simWorker.ts', '../sim/simulationCore.ts', '../sim/stateSync.ts', '../sim/protocol.ts', '../sim/simulationBridge.ts', '../sim/hosts.ts'], { query: '?raw', import: 'default', eager: true });
  const code = (name: string) => {
    const key = Object.keys(sources).find(k => k.endsWith('/' + name))!;
    return sources[key].replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  };

  it('uses no DOM global in the code that runs inside the worker', () => {
    for (const name of ['simWorker.ts', 'simulationCore.ts', 'stateSync.ts', 'protocol.ts']) expect(code(name)).not.toMatch(/\b(window|document|localStorage|sessionStorage|navigator|requestAnimationFrame)\b/);
  });

  it('draws no random numbers and reads no wall clock in the code that decides the simulation', () => {
    for (const name of ['simulationCore.ts', 'stateSync.ts', 'simulationBridge.ts']) expect(code(name)).not.toMatch(/Math\.random|Date\.now|new Date\(/);
  });

  it('builds the worker as a module worker from a URL Vite can bundle, and only on demand', () => {
    const hosts = code('hosts.ts');
    expect(hosts).toContain("new Worker(new URL('./simWorker.ts', import.meta.url), { type: 'module' })");
    expect(hosts).toMatch(/createBrowserWorker\s*=\s*\(\)\s*:?[^=]*=>\s*new Worker/);
  });
});
