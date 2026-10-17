// Phase 9.9: the sync engine's view of the Dexie save table, and its per-device record of what it last synced.

import { demoOwner } from '../session/demoAccounts';
import { autosaveId, listSaves, saveGame } from '../persistence/saveGame';
import { migrateSave } from '../persistence/migrations';
import type { SaveRecord } from '../persistence/database';
import type { GameState } from '../domain/game';
import { summarize } from './envelope';
import type { LocalCampaign, LocalSaves, MetaStore, SyncMeta } from './sync';

/** The newest save of each campaign for the current owner (manual saves and autosaves alike). */
async function newestPerCampaign(): Promise<Map<string, SaveRecord>> {
  const best = new Map<string, SaveRecord>();
  for (const record of await listSaves()) {
    const id = record.state?.world?.campaignId;
    if (typeof id !== 'string' || !id) continue;
    const have = best.get(id);
    if (!have || record.updatedAt > have.updatedAt) best.set(id, record);
  }
  return best;
}

export class DexieLocalSaves implements LocalSaves {
  async campaigns(): Promise<LocalCampaign[]> {
    return [...(await newestPerCampaign()).entries()].map(([campaignId, r]) => ({
      campaignId, recordId: r.id, name: r.name, updatedAt: r.updatedAt, summary: summarize(r.state), baseRevision: r.state.world.lineage?.baseRevision ?? 0,
    }));
  }
  async read(campaignId: string): Promise<GameState | null> {
    const record = (await newestPerCampaign()).get(campaignId);
    return record ? migrateSave(record.state) : null;
  }
  async write(state: GameState, campaignId: string, name: string): Promise<number> {
    return (await saveGame(state, autosaveId(campaignId), name, demoOwner())).updatedAt;
  }
}

const META_PREFIX = 'ron-cloud-meta-v1:';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** What this device last synced, per campaign, kept in localStorage under the current owner. */
export class LocalStorageMeta implements MetaStore {
  constructor(private readonly owner: string = demoOwner()) {}
  read(): Record<string, SyncMeta> {
    try {
      const raw = JSON.parse(localStorage.getItem(META_PREFIX + this.owner) ?? '{}') as Record<string, Partial<SyncMeta>>;
      const out: Record<string, SyncMeta> = {};
      for (const [id, m] of Object.entries(raw)) if (m && Number.isInteger(m.revision) && finite(m.localUpdatedAt) && finite(m.syncedAt) && typeof m.checksum === 'string') out[id] = m as SyncMeta;
      return out;
    } catch { return {}; }
  }
  write(campaignId: string, meta: SyncMeta | null): void {
    const all = this.read();
    if (meta) all[campaignId] = meta; else delete all[campaignId];
    try { localStorage.setItem(META_PREFIX + this.owner, JSON.stringify(all)); } catch { /* blocked: the next sync re-checks against the cloud */ }
  }
}
