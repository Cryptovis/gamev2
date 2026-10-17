// Phase 9.9: the cloud saves as the Options window uses them: one small store of what to show, and the actions behind its
// buttons. The sync engine does the work; this file builds it from the profile and the project settings, runs it, and turns
// the result into a phase the indicator can show. Nothing here runs until the player turns cloud saves on.

import { create } from 'zustand';
import { autosaveId, saveGame } from '../persistence/saveGame';
import { demoOwner } from '../session/demoAccounts';
import { useGameStore } from '../store/gameStore';
import { clearCloudConfig, readAutoSync, readCloudConfig, saveCloudConfig, writeAutoSync, type CloudConfig } from './cloudConfig';
import { CloudDeniedError, CloudSetupError, CloudUnavailableError, SupabaseCloudStore, type CloudStore } from './cloudStore';
import { enableCloudKey, guestProfile, joinProfile, leaveCloud, makeTransferCode, readTransferCode, setGuestLabel, type TransferFailure } from './guest';
import { DexieLocalSaves, LocalStorageMeta } from './localSaves';
import { CloudSyncService, type CampaignRow, type LocalSaves, type MetaStore, type SyncFailure, type SyncOutcome } from './sync';

export type CloudPhase = 'unconfigured' | 'no-key' | 'idle' | 'syncing' | 'synced' | 'conflict' | 'error' | 'offline' | 'locked';

export interface CloudView {
  phase: CloudPhase;
  configured: boolean;
  hasKey: boolean;
  /** A passphrase is held in memory, so new saves are sealed with it. */
  encrypted: boolean;
  autoSync: boolean;
  label: string;
  guestId: string;
  deviceId: string;
  rows: CampaignRow[];
  lastSyncAt: number | null;
  /** The reason the last action failed, as a code the window translates. */
  error: SyncFailure | 'setup-config' | null;
  /** The campaign being worked on, or '*' for a whole sync. */
  busy: string | null;
  /** The last action that finished, for the confirmation line. */
  last: SyncOutcome | null;
}

let passphrase: string | undefined;

export const useCloudView = create<CloudView>(() => snapshotView());

function snapshotView(): CloudView {
  const profile = guestProfile(), configured = readCloudConfig() !== null;
  return {
    phase: !configured ? 'unconfigured' : !profile.syncKey ? 'no-key' : 'idle', configured, hasKey: profile.syncKey !== null, encrypted: passphrase !== undefined,
    autoSync: readAutoSync(), label: profile.label, guestId: profile.guestId, deviceId: profile.deviceId, rows: [], lastSyncAt: null, error: null, busy: null, last: null,
  };
}

/** Everything a test replaces. */
export interface CloudOverrides { cloud?: CloudStore; local?: LocalSaves; meta?: MetaStore; now?: () => number; iterations?: number; compress?: boolean }
let overrides: CloudOverrides | null = null;
export function overrideCloudForTests(next: CloudOverrides | null) { overrides = next; service = null; }

let service: CloudSyncService | null = null;
let serviceKey = '';

/** The sync engine for the current project and profile, or null while either is missing. */
export function currentService(): CloudSyncService | null {
  const config = readCloudConfig(), profile = guestProfile();
  if (!overrides && (!config || !profile.syncKey)) return null;
  const key = `${config?.url}|${config?.anonKey}|${profile.syncKey}|${profile.deviceId}|${overrides ? 'o' : ''}`;
  if (service && key === serviceKey) return service;
  const cloud = overrides?.cloud ?? new SupabaseCloudStore(config as CloudConfig, profile.syncKey as string);
  service = new CloudSyncService({
    cloud, local: overrides?.local ?? new DexieLocalSaves(), meta: overrides?.meta ?? new LocalStorageMeta(), deviceId: profile.deviceId,
    now: overrides?.now ?? (() => Date.now()), passphrase: () => passphrase, newId: () => crypto.randomUUID(), iterations: overrides?.iterations, compress: overrides?.compress,
  });
  serviceKey = key;
  return service;
}

/** What the indicator shows, from the table, the last error and the connection. Pure, so it is tested on its own. */
export function derivePhase(input: { configured: boolean; hasKey: boolean; busy: boolean; online: boolean; error: CloudView['error']; rows: CampaignRow[] }): CloudPhase {
  if (!input.configured) return 'unconfigured';
  if (!input.hasKey) return 'no-key';
  if (input.busy) return 'syncing';
  if (input.error === 'locked' || input.error === 'wrong-passphrase') return 'locked';
  if (!input.online || input.error === 'offline') return 'offline';
  if (input.error) return 'error';
  if (input.rows.some(r => r.status === 'conflict')) return 'conflict';
  if (input.rows.length > 0 && input.rows.every(r => r.status === 'synced' || r.status === 'cloud-only')) return 'synced';
  return 'idle';
}

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

function publish(patch: Partial<CloudView>) {
  const base = { ...snapshotView(), rows: useCloudView.getState().rows, lastSyncAt: useCloudView.getState().lastSyncAt, last: useCloudView.getState().last, error: useCloudView.getState().error, busy: useCloudView.getState().busy };
  const next = { ...base, ...patch };
  useCloudView.setState({ ...next, phase: derivePhase({ configured: next.configured, hasKey: next.hasKey, busy: next.busy !== null, online: online(), error: next.error, rows: next.rows }) });
}

/** Re-reads the profile and project settings after one of them changed. */
export function refreshCloudProfile() { publish({}); }

const errorOf = (e: unknown): CloudView['error'] =>
  e instanceof CloudDeniedError ? 'denied' : e instanceof CloudSetupError ? 'setup' : e instanceof CloudUnavailableError ? (e.offline ? 'offline' : 'unavailable') : 'unavailable';

async function run<T>(busy: string, work: (svc: CloudSyncService) => Promise<T>): Promise<T | null> {
  const svc = currentService();
  if (!svc) { publish({}); return null; }
  publish({ busy, error: null });
  try { return await work(svc); }
  catch (e) { publish({ busy: null, error: errorOf(e) }); return null; }
}

async function settle(svc: CloudSyncService, outcome: SyncOutcome | SyncOutcome[]): Promise<void> {
  const list = Array.isArray(outcome) ? outcome : [outcome];
  const failed = list.find(o => !o.ok);
  let rows = useCloudView.getState().rows;
  try { rows = await svc.refresh(); } catch (e) { publish({ busy: null, error: errorOf(e), last: list.at(-1) ?? null }); return; }
  publish({ busy: null, rows, error: failed && !failed.ok && failed.reason !== 'conflict' ? failed.reason : null, last: list.at(-1) ?? null, lastSyncAt: failed ? useCloudView.getState().lastSyncAt : Date.now() });
}

/** Lists the campaigns on both sides. */
export async function refreshCloud(): Promise<void> {
  await run('*', async svc => {
    const rows = await svc.refresh();
    publish({ busy: null, rows, lastSyncAt: Date.now() });
  });
}

/** Writes the campaign being played to its local save first, so a push sends this moment and not the last autosave. */
export async function flushActiveCampaign(): Promise<string | null> {
  const live = useGameStore.getState();
  const id = live.world.campaignId;
  if (!id || live.campaignStatus !== 'active') return null;
  await saveGame(live, autosaveId(id), `Autosave · Day ${live.day}`, demoOwner());
  return id;
}

export async function syncAllNow(): Promise<void> {
  await run('*', async svc => {
    if (!overrides?.local) await flushActiveCampaign().catch(() => null);
    await settle(svc, await svc.syncAll());
  });
}

export async function pushCampaign(id: string): Promise<void> {
  await run(id, async svc => {
    if (!overrides?.local && useGameStore.getState().world.campaignId === id) await flushActiveCampaign().catch(() => null);
    await settle(svc, await svc.push(id));
  });
}
export async function pullCampaign(id: string): Promise<void> { await run(id, async svc => settle(svc, await svc.pull(id))); }
export async function resolveCampaign(id: string, choice: 'local' | 'cloud' | 'both'): Promise<void> {
  await run(id, async svc => {
    if (choice !== 'cloud' && !overrides?.local && useGameStore.getState().world.campaignId === id) await flushActiveCampaign().catch(() => null);
    await settle(svc, await svc.resolve(id, choice));
  });
}
export async function deleteCloudCopy(id: string): Promise<void> { await run(id, async svc => settle(svc, await svc.removeFromCloud(id))); }

/** Pushes one campaign if (and only if) this device is ahead of the cloud. Used by the automatic sync; never overwrites. */
export async function pushIfAhead(id: string): Promise<boolean> {
  const svc = currentService();
  if (!svc || !online()) return false;
  try {
    const row = (await svc.refresh()).find(r => r.campaignId === id);
    if (!row || (row.status !== 'local-only' && row.status !== 'local-ahead')) { publish({ rows: useCloudView.getState().rows }); return false; }
    const outcome = await svc.push(id);
    if (useCloudView.getState().busy === null) await settle(svc, outcome);
    return outcome.ok;
  } catch { return false; }
}

// ---- Profile and project settings -------------------------------------------------------------------------

export function turnOnCloudSaves() { enableCloudKey(); publish({ error: null }); }
export function turnOffCloudSaves() { leaveCloud(); passphrase = undefined; service = null; publish({ rows: [], error: null, last: null }); }
export function renameProfile(label: string) { setGuestLabel(label); publish({}); }
export function setCloudPassphrase(value: string) { passphrase = value || undefined; publish({ error: useCloudView.getState().error === 'locked' || useCloudView.getState().error === 'wrong-passphrase' ? null : useCloudView.getState().error }); }
export function setAutoSync(on: boolean) { writeAutoSync(on); publish({ autoSync: on }); }

export function connectProject(url: string, anonKey: string): boolean {
  const saved = saveCloudConfig({ url, anonKey });
  service = null;
  publish({ error: saved ? null : 'setup-config' });
  return saved !== null;
}
export function disconnectProject() { clearCloudConfig(); service = null; publish({ rows: [], error: null }); }

export async function createTransferCode(withPassphrase?: string): Promise<string> { return makeTransferCode(guestProfile(), withPassphrase, overrides?.iterations); }

export async function joinWithTransferCode(code: string, withPassphrase?: string): Promise<{ ok: true } | { ok: false; reason: TransferFailure }> {
  const result = await readTransferCode(code, withPassphrase);
  if (!result.ok) return result;
  joinProfile(result);
  service = null;
  publish({ rows: [], error: null });
  return { ok: true };
}

export function isAutoSyncReady(): boolean { return readAutoSync() && readCloudConfig() !== null && guestProfile().syncKey !== null; }
