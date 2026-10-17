// Phase 9.9: the sync engine. It decides, for each campaign, whether this device is behind, ahead or in conflict with the
// cloud, and moves sealed envelopes accordingly. It never decides silently between two histories: when both sides changed
// since they last agreed, it stops and reports a conflict for the player to settle.
//
// "Agreed" is tracked two ways: per device in SyncMeta (the cloud revision this device last synced and the local save's
// timestamp at that moment), and inside the save itself as world.lineage, so a save carried to another device (or a
// browser whose storage was cleared) still knows which cloud revision it descends from.

import type { GameState } from '../domain/game';
import { CloudConflictError, CloudDeniedError, CloudSetupError, CloudUnavailableError, type CloudRow, type CloudStore } from './cloudStore';
import { openEnvelope, sealEnvelope, summarize, withLineage, type EnvelopeSummary, type OpenFailure } from './envelope';

export interface LocalCampaign {
  campaignId: string;
  recordId: string;
  name: string;
  /** When the newest local save of this campaign was written. */
  updatedAt: number;
  summary: EnvelopeSummary;
  /** world.lineage.baseRevision of that save, or 0. */
  baseRevision: number;
}

/** Local saves as the engine sees them: Dexie in the game, a map in tests. */
export interface LocalSaves {
  /** The newest save of each campaign. */
  campaigns(): Promise<LocalCampaign[]>;
  read(campaignId: string): Promise<GameState | null>;
  /** Stores a campaign and returns the timestamp it was written with. */
  write(state: GameState, campaignId: string, name: string): Promise<number>;
}

export interface SyncMeta { revision: number; localUpdatedAt: number; checksum: string; syncedAt: number }
export interface MetaStore { read(): Record<string, SyncMeta>; write(campaignId: string, meta: SyncMeta | null): void }

export type CampaignSyncStatus = 'local-only' | 'cloud-only' | 'synced' | 'local-ahead' | 'cloud-ahead' | 'conflict';

/**
 * Where a campaign stands. `base` is the cloud revision both sides last agreed on: this device's record of it if there is
 * one, otherwise what the local save says in its lineage, otherwise nothing (0).
 */
export function planCampaign(local: LocalCampaign | null, remote: CloudRow | null, meta: SyncMeta | null): CampaignSyncStatus {
  if (!local && !remote) return 'synced';
  if (!remote) return 'local-only';
  if (!local) return 'cloud-only';
  const base = meta?.revision ?? local.baseRevision;
  const remoteAhead = remote.revision > base;
  // Without a record of the last sync, a save whose lineage matches the cloud is taken as unchanged, and one that does not is a divergence.
  const localChanged = meta ? local.updatedAt > meta.localUpdatedAt : base !== remote.revision || base === 0;
  if (!remoteAhead && !localChanged) return 'synced';
  if (!remoteAhead) return 'local-ahead';
  if (!localChanged) return 'cloud-ahead';
  return 'conflict';
}

export interface CampaignRow {
  campaignId: string;
  status: CampaignSyncStatus;
  local: LocalCampaign | null;
  remote: CloudRow | null;
  meta: SyncMeta | null;
}

export type SyncFailure = 'conflict' | 'offline' | 'unavailable' | 'denied' | 'setup' | 'locked' | 'wrong-passphrase' | 'corrupt' | 'newer-game' | 'incompatible' | 'nothing';
export type SyncOutcome =
  | { ok: true; campaignId: string; action: 'push' | 'pull' | 'copy' | 'none'; revision?: number; copyId?: string }
  | { ok: false; campaignId: string; reason: SyncFailure };

const OPEN_FAILURES: Record<OpenFailure, SyncFailure> = {
  format: 'corrupt', header: 'corrupt', checksum: 'corrupt', payload: 'corrupt', mismatch: 'corrupt',
  version: 'newer-game', locked: 'locked', decrypt: 'wrong-passphrase', incompatible: 'incompatible',
};

export interface SyncDeps {
  cloud: CloudStore;
  local: LocalSaves;
  meta: MetaStore;
  deviceId: string;
  now: () => number;
  passphrase: () => string | undefined;
  /** A fresh campaign id, for "keep both". */
  newId: () => string;
  /** PBKDF2 rounds for new envelopes; tests lower it. */
  iterations?: number;
  compress?: boolean;
}

function failure(campaignId: string, error: unknown): SyncOutcome {
  if (error instanceof CloudConflictError) return { ok: false, campaignId, reason: 'conflict' };
  if (error instanceof CloudDeniedError) return { ok: false, campaignId, reason: 'denied' };
  if (error instanceof CloudSetupError) return { ok: false, campaignId, reason: 'setup' };
  if (error instanceof CloudUnavailableError) return { ok: false, campaignId, reason: error.offline ? 'offline' : 'unavailable' };
  return { ok: false, campaignId, reason: 'unavailable' };
}

export class CloudSyncService {
  constructor(private readonly deps: SyncDeps) {}

  /** Lists both sides and says where each campaign stands. Campaigns present on either side are included. */
  async refresh(): Promise<CampaignRow[]> {
    const [locals, remotes] = await Promise.all([this.deps.local.campaigns(), this.deps.cloud.list()]);
    const meta = this.deps.meta.read();
    const ids = new Set([...locals.map(l => l.campaignId), ...remotes.map(r => r.campaignId)]);
    const rows: CampaignRow[] = [];
    for (const campaignId of ids) {
      const local = locals.find(l => l.campaignId === campaignId) ?? null, remote = remotes.find(r => r.campaignId === campaignId) ?? null;
      rows.push({ campaignId, local, remote, meta: meta[campaignId] ?? null, status: planCampaign(local, remote, meta[campaignId] ?? null) });
    }
    // Newest activity first, whichever side it was on.
    return rows.sort((a, b) => Math.max(b.local?.updatedAt ?? 0, b.remote?.updatedAt ?? 0) - Math.max(a.local?.updatedAt ?? 0, a.remote?.updatedAt ?? 0));
  }

  private async row(campaignId: string): Promise<CampaignRow | null> {
    return (await this.refresh()).find(r => r.campaignId === campaignId) ?? null;
  }

  /** Seals the local copy and writes it as the next cloud revision. `force` overwrites a cloud copy that moved on (the player chose this device's version). */
  async push(campaignId: string, options: { force?: boolean } = {}): Promise<SyncOutcome> {
    try {
      const row = await this.row(campaignId);
      if (!row?.local) return { ok: false, campaignId, reason: 'nothing' };
      if (row.status === 'synced') return { ok: true, campaignId, action: 'none', revision: row.remote?.revision };
      if ((row.status === 'cloud-ahead' || row.status === 'conflict') && !options.force) return { ok: false, campaignId, reason: 'conflict' };
      const state = await this.deps.local.read(campaignId);
      if (!state) return { ok: false, campaignId, reason: 'nothing' };
      const expected = row.remote?.revision ?? 0, revision = expected + 1;
      const envelope = await sealEnvelope(withLineage(state, { baseRevision: revision, deviceId: this.deps.deviceId, syncedDay: state.day }), {
        campaignId, revision, deviceId: this.deps.deviceId, createdAt: this.deps.now(), passphrase: this.deps.passphrase(), iterations: this.deps.iterations, compress: this.deps.compress,
      });
      await this.deps.cloud.put(envelope, expected);
      this.deps.meta.write(campaignId, { revision, localUpdatedAt: row.local.updatedAt, checksum: envelope.checksum, syncedAt: this.deps.now() });
      return { ok: true, campaignId, action: 'push', revision };
    } catch (error) { return failure(campaignId, error); }
  }

  /** Downloads the cloud copy, checks it, and stores it as the newest local save. `asCopy` stores it as a separate campaign instead. */
  async pull(campaignId: string, options: { asCopy?: boolean } = {}): Promise<SyncOutcome> {
    try {
      const envelope = await this.deps.cloud.get(campaignId);
      if (!envelope) return { ok: false, campaignId, reason: 'nothing' };
      const opened = await openEnvelope(envelope, { passphrase: this.deps.passphrase() });
      if (!opened.ok) return { ok: false, campaignId, reason: OPEN_FAILURES[opened.reason] };
      if (options.asCopy) {
        const copyId = this.deps.newId();
        const { lineage: _dropped, ...world } = opened.state.world;
        const copy: GameState = { ...opened.state, world: { ...world, campaignId: copyId } };
        await this.deps.local.write(copy, copyId, `Cloud copy · Day ${copy.day}`);
        return { ok: true, campaignId, action: 'copy', copyId, revision: envelope.revision };
      }
      const updatedAt = await this.deps.local.write(opened.state, campaignId, `Cloud · Day ${opened.state.day}`);
      this.deps.meta.write(campaignId, { revision: envelope.revision, localUpdatedAt: updatedAt, checksum: envelope.checksum, syncedAt: this.deps.now() });
      return { ok: true, campaignId, action: 'pull', revision: envelope.revision };
    } catch (error) { return failure(campaignId, error); }
  }

  /**
   * Settles a conflict. 'local' keeps this device's campaign and overwrites the cloud; 'cloud' replaces this device's with
   * the cloud's; 'both' keeps the cloud's as a separate local campaign and then overwrites the cloud with this device's.
   */
  async resolve(campaignId: string, choice: 'local' | 'cloud' | 'both'): Promise<SyncOutcome> {
    if (choice === 'cloud') return this.pull(campaignId);
    if (choice === 'local') return this.push(campaignId, { force: true });
    const copy = await this.pull(campaignId, { asCopy: true });
    if (!copy.ok) return copy;
    const pushed = await this.push(campaignId, { force: true });
    return pushed.ok ? { ...pushed, copyId: copy.ok ? copy.copyId : undefined } : pushed;
  }

  /** Pushes what is ahead here and pulls what is ahead there. Conflicts and cloud-only campaigns are left for the player. */
  async syncAll(): Promise<SyncOutcome[]> {
    let rows: CampaignRow[];
    try { rows = await this.refresh(); } catch (error) { return [failure('*', error)]; }
    const out: SyncOutcome[] = [];
    for (const row of rows) {
      if (row.status === 'local-only' || row.status === 'local-ahead') out.push(await this.push(row.campaignId));
      else if (row.status === 'cloud-ahead') out.push(await this.pull(row.campaignId));
    }
    return out;
  }

  /** Deletes the cloud copy. The local save and this device's record of the sync are left alone, so it shows as local-only again. */
  async removeFromCloud(campaignId: string): Promise<SyncOutcome> {
    try { await this.deps.cloud.remove(campaignId); this.deps.meta.write(campaignId, null); return { ok: true, campaignId, action: 'none' }; }
    catch (error) { return failure(campaignId, error); }
  }
}

export { summarize };
