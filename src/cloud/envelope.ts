// Phase 9.9: the cloud save envelope. A campaign is sealed into one self-describing record: a small readable header
// (what campaign, which revision, how it is wrapped) and a payload that is the JSON save, optionally gzip-compressed and
// optionally encrypted with AES-GCM under a key derived from the player's passphrase. A checksum over header and payload
// catches corruption and truncation before anything is parsed; the GCM tag catches tampering and a wrong passphrase.

import type { GameState } from '../domain/game';
import type { SaveLineage } from '../domain/lineage';
import { canLoadSave, migrateSave } from '../persistence/migrations';
import { pickSnapshot } from '../persistence/snapshot';
import { ENVELOPE_FORMAT, ENVELOPE_VERSION, envelopeShapeError } from '../persistence/validation099';
import { canCompress, fromBase64Url, fromUtf8, gunzip, gzip, randomBytes, sha256Hex, toBase64Url, utf8 } from './bytes';

export { ENVELOPE_FORMAT, ENVELOPE_VERSION };

export interface EnvelopeSummary {
  countryId: string;
  countryName: string;
  commander: string;
  day: number;
  campaignStatus: 'active' | 'lost' | 'won';
  schemaVersion: number;
}

export interface EnvelopeEncoding {
  compression: 'none' | 'gzip';
  cipher: 'none' | 'aes-gcm';
  kdf?: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  iv?: string;
}

export interface SaveEnvelope {
  format: typeof ENVELOPE_FORMAT;
  version: number;
  campaignId: string;
  /** The cloud revision this envelope is. */
  revision: number;
  deviceId: string;
  /** Wall-clock milliseconds when it was sealed. Persistence only; never read by the simulation. */
  createdAt: number;
  summary: EnvelopeSummary;
  encoding: EnvelopeEncoding;
  /** base64url of the (compressed, encrypted) JSON save. */
  payload: string;
  /** Size of the payload in bytes, before base64. */
  bytes: number;
  /** SHA-256 of the header and the payload. */
  checksum: string;
}

export interface SealOptions {
  campaignId: string;
  revision: number;
  deviceId: string;
  createdAt: number;
  /** Encrypts when present and non-empty. */
  passphrase?: string;
  /** PBKDF2 rounds. The default is slow on purpose; tests lower it. */
  iterations?: number;
  /** Compresses when the runtime can. Default true. */
  compress?: boolean;
}

export const DEFAULT_KDF_ITERATIONS = 210_000;

/** The summary shown in the cloud list, taken from the save itself. */
export function summarize(state: GameState): EnvelopeSummary {
  const player = state.countries[state.playerCountryId];
  return {
    countryId: state.playerCountryId, countryName: player?.name ?? state.playerCountryId,
    commander: state.playerProfile?.commanderName ?? '', day: state.day, campaignStatus: state.campaignStatus, schemaVersion: state.schemaVersion,
  };
}

/** The save with its cloud lineage stamped: this revision, this device, this day. */
export function withLineage(state: GameState, lineage: SaveLineage): GameState {
  return { ...state, world: { ...state.world, lineage } };
}

/** What the checksum and the cipher both cover. Field order is fixed here, so it never depends on how an object was built. */
function headerText(e: Omit<SaveEnvelope, 'payload' | 'bytes' | 'checksum'>): string {
  const k = e.encoding.kdf;
  return JSON.stringify([e.format, e.version, e.campaignId, e.revision, e.deviceId, e.createdAt, e.summary.day, e.summary.schemaVersion, e.encoding.compression, e.encoding.cipher, k?.iterations ?? 0, k?.salt ?? '', e.encoding.iv ?? '']);
}

async function deriveKey(passphrase: string, salt: Uint8Array, iterations: number, usage: KeyUsage[]): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', utf8(passphrase) as BufferSource, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, material, { name: 'AES-GCM', length: 256 }, false, usage);
}

export async function sealEnvelope(state: GameState, options: SealOptions): Promise<SaveEnvelope> {
  let bytes = utf8(JSON.stringify(pickSnapshot(state)));
  const compression: EnvelopeEncoding['compression'] = options.compress !== false && canCompress() ? 'gzip' : 'none';
  if (compression === 'gzip') bytes = await gzip(bytes);
  const encoding: EnvelopeEncoding = { compression, cipher: 'none' };
  const head = { format: ENVELOPE_FORMAT, version: ENVELOPE_VERSION, campaignId: options.campaignId, revision: options.revision, deviceId: options.deviceId, createdAt: options.createdAt, summary: summarize(state), encoding } as const;
  if (options.passphrase) {
    const iterations = options.iterations ?? DEFAULT_KDF_ITERATIONS, salt = randomBytes(16), iv = randomBytes(12);
    encoding.cipher = 'aes-gcm';
    encoding.kdf = { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64Url(salt) };
    encoding.iv = toBase64Url(iv);
    const key = await deriveKey(options.passphrase, salt, iterations, ['encrypt']);
    bytes = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: utf8(headerText(head)) as BufferSource }, key, bytes as BufferSource));
  }
  const payload = toBase64Url(bytes);
  const checksum = await sha256Hex(headerText(head) + '\n' + payload);
  return { ...head, payload, bytes: bytes.length, checksum };
}

export type OpenFailure =
  | 'format'        // not one of our envelopes
  | 'version'       // written by a newer game
  | 'header'        // fields missing or out of range
  | 'checksum'      // damaged or truncated
  | 'locked'        // encrypted and no passphrase was given
  | 'decrypt'       // wrong passphrase, or altered after sealing
  | 'payload'       // not a readable save
  | 'incompatible'  // a save this build cannot load
  | 'mismatch';     // header and save disagree about the campaign

export type OpenResult = { ok: true; state: GameState; envelope: SaveEnvelope } | { ok: false; reason: OpenFailure };

/** Peeks at the header without touching the payload: is this envelope encrypted? */
export const isEncrypted = (e: Pick<SaveEnvelope, 'encoding'>) => e.encoding.cipher === 'aes-gcm';

export async function openEnvelope(value: unknown, options: { passphrase?: string } = {}): Promise<OpenResult> {
  const shape = envelopeShapeError(value);
  if (shape) return { ok: false, reason: shape };
  const envelope = value as SaveEnvelope;
  const head = headerText(envelope);
  if ((await sha256Hex(head + '\n' + envelope.payload)) !== envelope.checksum) return { ok: false, reason: 'checksum' };
  let bytes: Uint8Array;
  try { bytes = fromBase64Url(envelope.payload); } catch { return { ok: false, reason: 'payload' }; }
  if (bytes.length !== envelope.bytes) return { ok: false, reason: 'checksum' };
  if (envelope.encoding.cipher === 'aes-gcm') {
    if (!options.passphrase) return { ok: false, reason: 'locked' };
    try {
      const kdf = envelope.encoding.kdf!;
      const key = await deriveKey(options.passphrase, fromBase64Url(kdf.salt), kdf.iterations, ['decrypt']);
      bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(envelope.encoding.iv!) as BufferSource, additionalData: utf8(head) as BufferSource }, key, bytes as BufferSource));
    } catch { return { ok: false, reason: 'decrypt' }; }
  }
  let parsed: unknown;
  try {
    if (envelope.encoding.compression === 'gzip') bytes = await gunzip(bytes);
    parsed = JSON.parse(fromUtf8(bytes));
  } catch { return { ok: false, reason: 'payload' }; }
  if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'payload' };
  const state = migrateSave(parsed as GameState);
  if (!state || !canLoadSave(state)) return { ok: false, reason: 'incompatible' };
  if (state.world.campaignId !== envelope.campaignId || state.day !== envelope.summary.day) return { ok: false, reason: 'mismatch' };
  return { ok: true, state, envelope };
}
