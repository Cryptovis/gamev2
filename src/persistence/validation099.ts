import type { SaveLineage } from '../domain/lineage';

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

/** A device id is an opaque token: short, printable, no spaces. */
export const DEVICE_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function validLineage(value: unknown, day: number): value is SaveLineage {
  return obj(value) && int(value.baseRevision, 0, 1_000_000_000) && typeof value.deviceId === 'string' && DEVICE_ID.test(value.deviceId) && int(value.syncedDay, 0, 1_000_000) && value.syncedDay <= day;
}

/**
 * Phase 9.9 save lineage (world.lineage, optional). A save without it is valid; a present one must name a revision, a
 * device and a campaign day that is not in the save's future.
 */
export function validLineageState(value: unknown): boolean {
  const s = value as { day?: number; world?: { lineage?: unknown } };
  const lineage = s?.world?.lineage;
  if (lineage === undefined) return true;
  return typeof s.day === 'number' && validLineage(lineage, s.day);
}

// ---- Cloud envelope header ----------------------------------------------------------------------------------

export const ENVELOPE_FORMAT = 'ron-save-envelope';
export const ENVELOPE_VERSION = 1;
const B64URL = /^[A-Za-z0-9_-]*$/;
const MAX_PAYLOAD_BYTES = 64 * 1024 * 1024;

export type EnvelopeShapeError = 'format' | 'version' | 'header';

/**
 * Checks the header of a cloud envelope before anything is decrypted or parsed: the format and version, the campaign it
 * claims to carry, how the payload is wrapped, and its size. Says nothing about the payload itself; opening does that.
 */
export function envelopeShapeError(value: unknown): EnvelopeShapeError | null {
  if (!obj(value) || value.format !== ENVELOPE_FORMAT) return 'format';
  if (!int(value.version, 1, 1_000_000)) return 'format';
  if (value.version > ENVELOPE_VERSION) return 'version';
  const e = value.encoding, summary = value.summary;
  if (!(typeof value.campaignId === 'string' && value.campaignId.length >= 1 && value.campaignId.length <= 80)) return 'header';
  if (!int(value.revision, 1, 1_000_000_000) || typeof value.deviceId !== 'string' || !DEVICE_ID.test(value.deviceId)) return 'header';
  if (typeof value.createdAt !== 'number' || !Number.isFinite(value.createdAt) || value.createdAt < 0) return 'header';
  if (!obj(summary) || !int(summary.day, 0, 1_000_000) || !int(summary.schemaVersion, 0, 10_000) || typeof summary.countryId !== 'string' || typeof summary.countryName !== 'string' || typeof summary.commander !== 'string') return 'header';
  if (summary.campaignStatus !== 'active' && summary.campaignStatus !== 'lost' && summary.campaignStatus !== 'won') return 'header';
  if (!obj(e) || (e.compression !== 'none' && e.compression !== 'gzip') || (e.cipher !== 'none' && e.cipher !== 'aes-gcm')) return 'header';
  if (e.cipher === 'aes-gcm') {
    const kdf = e.kdf;
    if (!obj(kdf) || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' || !int(kdf.iterations, 1000, 1_000_000)) return 'header';
    if (typeof kdf.salt !== 'string' || !B64URL.test(kdf.salt) || kdf.salt.length < 8 || kdf.salt.length > 64) return 'header';
    if (typeof e.iv !== 'string' || !B64URL.test(e.iv) || e.iv.length !== 16) return 'header';
  }
  if (typeof value.payload !== 'string' || !int(value.bytes, 0, MAX_PAYLOAD_BYTES)) return 'header';
  if (typeof value.checksum !== 'string' || !/^[0-9a-f]{64}$/.test(value.checksum)) return 'header';
  return null;
}
