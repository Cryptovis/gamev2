// Phase 9.9: where sealed campaigns live. CloudStore is the seam: the Supabase implementation talks to a project over
// fetch (no client library, so no new dependency), the in-memory one backs the tests and an offline demo, and the sync
// engine cannot tell them apart.

import { ENVELOPE_FORMAT, envelopeShapeError } from '../persistence/validation099';
import { sha256Hex } from './bytes';
import type { CloudConfig } from './cloudConfig';
import type { EnvelopeSummary, SaveEnvelope } from './envelope';

/** What the list shows about a campaign in the cloud: everything except the payload. */
export interface CloudRow {
  campaignId: string;
  revision: number;
  deviceId: string;
  /** Milliseconds since the epoch, as the server saw the write. */
  updatedAt: number;
  day: number;
  schemaVersion: number;
  bytes: number;
  checksum: string;
  summary: EnvelopeSummary;
}

/** The revision moved since the caller last looked: somebody else wrote first. */
export class CloudConflictError extends Error {
  constructor(readonly currentRevision: number | null) { super('The cloud copy changed since it was last read.'); this.name = 'CloudConflictError'; }
}
/** The cloud could not be reached, or answered with a server error. Worth retrying later. */
export class CloudUnavailableError extends Error {
  constructor(message: string, readonly offline: boolean) { super(message); this.name = 'CloudUnavailableError'; }
}
/** The project refused the sync key or the project key. Retrying will not help. */
export class CloudDeniedError extends Error {
  constructor(message = 'The cloud refused the request. Check the project key and the sync code.') { super(message); this.name = 'CloudDeniedError'; }
}
/** The project is reachable but the table is missing: the migration was not applied. */
export class CloudSetupError extends Error {
  constructor(message = 'The cloud project has no save table yet. Apply the migration in supabase/migrations.') { super(message); this.name = 'CloudSetupError'; }
}

export interface CloudStore {
  list(): Promise<CloudRow[]>;
  get(campaignId: string): Promise<SaveEnvelope | null>;
  /**
   * Writes a revision. `expectedRevision` is the revision the caller based it on (0 when the campaign is not in the cloud
   * yet); if the cloud holds a different one the write is refused with CloudConflictError and nothing changes.
   */
  put(envelope: SaveEnvelope, expectedRevision: number): Promise<CloudRow>;
  remove(campaignId: string, expectedRevision?: number): Promise<void>;
}

export const rowOf = (e: SaveEnvelope, updatedAt: number): CloudRow => ({
  campaignId: e.campaignId, revision: e.revision, deviceId: e.deviceId, updatedAt, day: e.summary.day, schemaVersion: e.summary.schemaVersion, bytes: e.bytes, checksum: e.checksum, summary: e.summary,
});

// ---- In memory --------------------------------------------------------------------------------------------

/** Shared by several "devices" in a test: each device gets its own sync engine over the same store. */
export class MemoryCloudStore implements CloudStore {
  private rows = new Map<string, SaveEnvelope & { updatedAt: number }>();
  /** Set to make the next call (or all calls, with `sticky`) fail with this error. */
  failWith: Error | null = null;
  sticky = false;
  calls: string[] = [];
  constructor(private readonly clock: () => number = () => Date.now()) {}

  private enter(name: string) {
    this.calls.push(name);
    if (this.failWith) { const e = this.failWith; if (!this.sticky) this.failWith = null; throw e; }
  }
  async list() { this.enter('list'); return [...this.rows.values()].map(r => rowOf(r, r.updatedAt)).sort((a, b) => b.updatedAt - a.updatedAt); }
  async get(campaignId: string) {
    this.enter('get');
    const r = this.rows.get(campaignId);
    return r ? structuredClone((({ updatedAt: _u, ...e }) => e)(r)) as SaveEnvelope : null;
  }
  async put(envelope: SaveEnvelope, expectedRevision: number) {
    this.enter('put');
    const current = this.rows.get(envelope.campaignId);
    if ((current?.revision ?? 0) !== expectedRevision) throw new CloudConflictError(current?.revision ?? null);
    const stored = { ...structuredClone(envelope), updatedAt: this.clock() };
    this.rows.set(envelope.campaignId, stored);
    return rowOf(stored, stored.updatedAt);
  }
  async remove(campaignId: string, expectedRevision?: number) {
    this.enter('remove');
    const current = this.rows.get(campaignId);
    if (expectedRevision !== undefined && (current?.revision ?? 0) !== expectedRevision) throw new CloudConflictError(current?.revision ?? null);
    this.rows.delete(campaignId);
  }
  /** Test hook: change a stored envelope behind the engine's back (corruption, another device's write). */
  tamper(campaignId: string, change: (e: SaveEnvelope) => SaveEnvelope) {
    const r = this.rows.get(campaignId);
    if (r) this.rows.set(campaignId, { ...change(r), updatedAt: r.updatedAt });
  }
}

// ---- Supabase (PostgREST over fetch) ---------------------------------------------------------------------

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
export const TABLE = 'ron_cloud_saves';
const REQUEST_TIMEOUT_MS = 20_000;

interface Row {
  owner_key: string; campaign_id: string; revision: number; device_id: string; updated_at: string; day: number; schema_version: number; bytes: number; checksum: string; summary: EnvelopeSummary; envelope?: SaveEnvelope;
}

const rowFrom = (r: Row): CloudRow => ({ campaignId: r.campaign_id, revision: r.revision, deviceId: r.device_id, updatedAt: Date.parse(r.updated_at), day: r.day, schemaVersion: r.schema_version, bytes: r.bytes, checksum: r.checksum, summary: r.summary });
const LIST_COLUMNS = 'campaign_id,revision,device_id,updated_at,day,schema_version,bytes,checksum,summary';

/**
 * Talks to the ron_cloud_saves table through PostgREST. Every request carries the project key and the profile's sync key
 * (header x-ron-sync-key); the row-level-security policy only lets a request see rows whose owner_key is the SHA-256 of
 * that header, so one profile cannot read another's saves.
 */
export class SupabaseCloudStore implements CloudStore {
  private ownerKey: Promise<string>;
  constructor(private readonly config: CloudConfig, private readonly syncKey: string, private readonly fetchImpl: FetchLike = (i, init) => fetch(i, init)) {
    this.ownerKey = sha256Hex(syncKey);
  }

  private async request(path: string, init: RequestInit & { prefer?: string } = {}): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const headers: Record<string, string> = {
      apikey: this.config.anonKey, Authorization: `Bearer ${this.config.anonKey}`, 'x-ron-sync-key': this.syncKey, 'Content-Type': 'application/json', Accept: 'application/json',
    };
    if (init.prefer) headers.Prefer = init.prefer;
    let response: Response;
    try { response = await this.fetchImpl(`${this.config.url}/rest/v1/${path}`, { ...init, headers, signal: controller.signal }); }
    catch (error) {
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new CloudUnavailableError(aborted ? 'The cloud did not answer in time.' : 'Could not reach the cloud.', !aborted);
    } finally { clearTimeout(timer); }
    return response;
  }

  /** Maps the failures every call shares; returns for success. */
  private async check(response: Response): Promise<void> {
    if (response.ok) return;
    if (response.status === 401 || response.status === 403) throw new CloudDeniedError();
    if (response.status === 404) throw new CloudSetupError();
    const body = await response.text().catch(() => '');
    if (response.status === 400 && /relation .* does not exist|PGRST205|PGRST200/.test(body)) throw new CloudSetupError();
    throw new CloudUnavailableError(`The cloud answered ${response.status}.`, false);
  }

  async list(): Promise<CloudRow[]> {
    const owner = await this.ownerKey;
    const response = await this.request(`${TABLE}?owner_key=eq.${owner}&select=${LIST_COLUMNS}&order=updated_at.desc`);
    await this.check(response);
    const rows = await response.json() as Row[];
    return Array.isArray(rows) ? rows.map(rowFrom) : [];
  }

  async get(campaignId: string): Promise<SaveEnvelope | null> {
    const owner = await this.ownerKey;
    const response = await this.request(`${TABLE}?owner_key=eq.${owner}&campaign_id=eq.${encodeURIComponent(campaignId)}&select=envelope`);
    await this.check(response);
    const rows = await response.json() as { envelope?: unknown }[];
    const envelope = rows?.[0]?.envelope;
    if (envelope === undefined) return null;
    // The row is data from the network: confirm it is an envelope before anyone trusts a field of it.
    if (envelopeShapeError(envelope) !== null) throw new CloudUnavailableError('The cloud returned a record this game cannot read.', false);
    return envelope as SaveEnvelope;
  }

  async put(envelope: SaveEnvelope, expectedRevision: number): Promise<CloudRow> {
    const owner = await this.ownerKey;
    const body = JSON.stringify({
      owner_key: owner, campaign_id: envelope.campaignId, revision: envelope.revision, device_id: envelope.deviceId, updated_at: new Date().toISOString(),
      day: envelope.summary.day, schema_version: envelope.summary.schemaVersion, bytes: envelope.bytes, checksum: envelope.checksum, summary: envelope.summary, envelope,
    });
    if (expectedRevision === 0) {
      const response = await this.request(TABLE, { method: 'POST', body, prefer: 'return=representation' });
      if (response.status === 409) throw new CloudConflictError(await this.currentRevision(envelope.campaignId));
      await this.check(response);
      const rows = await response.json() as Row[];
      return rowFrom(rows[0]);
    }
    const response = await this.request(`${TABLE}?owner_key=eq.${owner}&campaign_id=eq.${encodeURIComponent(envelope.campaignId)}&revision=eq.${expectedRevision}`, { method: 'PATCH', body, prefer: 'return=representation' });
    await this.check(response);
    const rows = await response.json() as Row[];
    // An update that matched no row means the revision is no longer the one the caller read.
    if (!Array.isArray(rows) || rows.length === 0) throw new CloudConflictError(await this.currentRevision(envelope.campaignId));
    return rowFrom(rows[0]);
  }

  async remove(campaignId: string, expectedRevision?: number): Promise<void> {
    const owner = await this.ownerKey;
    const revision = expectedRevision === undefined ? '' : `&revision=eq.${expectedRevision}`;
    const response = await this.request(`${TABLE}?owner_key=eq.${owner}&campaign_id=eq.${encodeURIComponent(campaignId)}${revision}`, { method: 'DELETE', prefer: 'return=representation' });
    await this.check(response);
    const rows = await response.json() as unknown[];
    if (expectedRevision !== undefined && rows.length === 0) throw new CloudConflictError(await this.currentRevision(campaignId));
  }

  private async currentRevision(campaignId: string): Promise<number | null> {
    try { return (await this.list()).find(r => r.campaignId === campaignId)?.revision ?? null; } catch { return null; }
  }
}

export { ENVELOPE_FORMAT };
