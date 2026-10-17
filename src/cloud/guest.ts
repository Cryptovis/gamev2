// Phase 9.9: the guest profile for cloud saves. A guest has no account. The profile holds a random sync key; whoever holds
// the key can read and write that profile's cloud saves, so the key is the credential. A second device joins by entering the
// transfer code, which carries the key (optionally encrypted under a passphrase) and nothing else.

import { fromBase64Url, fromUtf8, randomBytes, sha256Hex, toBase64Url, utf8 } from './bytes';

export interface GuestProfile {
  /** Names this browser profile in the cloud list. Shared across the devices that joined with the transfer code. */
  guestId: string;
  /** Names this device. Never shared: it tells two devices writing to the same profile apart. */
  deviceId: string;
  label: string;
  /** The sync key (43 characters of base64url) or null before cloud saves are turned on. */
  syncKey: string | null;
  createdAt: number;
}

const PROFILE_KEY = 'ron-guest-profile-v1';
export const SYNC_KEY_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const newId = (prefix: string) => `${prefix}-${toBase64Url(randomBytes(9))}`;

function readStored(): GuestProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<GuestProfile>;
    if (typeof p.guestId !== 'string' || typeof p.deviceId !== 'string' || typeof p.label !== 'string' || typeof p.createdAt !== 'number') return null;
    if (p.syncKey !== null && !(typeof p.syncKey === 'string' && SYNC_KEY_PATTERN.test(p.syncKey))) return null;
    return p as GuestProfile;
  } catch { return null; }
}

function store(profile: GuestProfile): GuestProfile {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch { /* storage blocked: the profile lasts until the page is closed */ }
  return profile;
}

let memory: GuestProfile | null = null;

/** The guest profile of this browser, created on first use. */
export function guestProfile(now: number = Date.now()): GuestProfile {
  const stored = readStored() ?? memory;
  if (stored) return stored;
  memory = store({ guestId: newId('guest'), deviceId: newId('dev'), label: 'Guest', syncKey: null, createdAt: now });
  return memory;
}

/** Turns cloud saves on for this profile by minting a sync key. Idempotent. */
export function enableCloudKey(): GuestProfile {
  const p = guestProfile();
  if (p.syncKey) return p;
  memory = store({ ...p, syncKey: toBase64Url(randomBytes(32)) });
  return memory;
}

export function setGuestLabel(label: string): GuestProfile {
  memory = store({ ...guestProfile(), label: label.trim().slice(0, 40) || 'Guest' });
  return memory;
}

/** Forgets the sync key (leaving the cloud). The cloud copies stay under the old key. */
export function leaveCloud(): GuestProfile {
  memory = store({ ...guestProfile(), syncKey: null });
  return memory;
}

/** Test hook: forget everything held in memory so the next call reads storage again. */
export function resetGuestProfileCache() { memory = null; }

// ---- Transfer code ----------------------------------------------------------------------------------------

const PLAIN = 'RON-SYNC-1:';
const SEALED = 'RON-SYNC-1E:';
const CHECK_LENGTH = 6;

export type TransferFailure = 'format' | 'checksum' | 'locked' | 'decrypt' | 'key';
export type TransferResult = { ok: true; guestId: string; label: string; syncKey: string } | { ok: false; reason: TransferFailure };

const checkOf = async (body: string) => (await sha256Hex(body)).slice(0, CHECK_LENGTH);

/**
 * The code that joins another device to this profile. Anyone who sees it can read and write these saves, so it can be
 * sealed under a passphrase the player says out loud; the six-character tail catches a mistyped code.
 */
export async function makeTransferCode(profile: GuestProfile, passphrase?: string, iterations = 210_000): Promise<string> {
  if (!profile.syncKey) throw new Error('Turn on cloud saves first.');
  const data = utf8(JSON.stringify({ v: 1, guestId: profile.guestId, label: profile.label, syncKey: profile.syncKey }));
  if (!passphrase) { const body = toBase64Url(data); return `${PLAIN}${body}.${await checkOf(body)}`; }
  const salt = randomBytes(16), iv = randomBytes(12);
  const material = await crypto.subtle.importKey('raw', utf8(passphrase) as BufferSource, 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource));
  const body = toBase64Url(utf8(JSON.stringify({ i: iterations, s: toBase64Url(salt), n: toBase64Url(iv), c: toBase64Url(cipher) })));
  return `${SEALED}${body}.${await checkOf(body)}`;
}

export async function readTransferCode(code: string, passphrase?: string): Promise<TransferResult> {
  const text = code.trim();
  const sealed = text.startsWith(SEALED);
  if (!sealed && !text.startsWith(PLAIN)) return { ok: false, reason: 'format' };
  const rest = text.slice((sealed ? SEALED : PLAIN).length), dot = rest.lastIndexOf('.');
  if (dot < 1) return { ok: false, reason: 'format' };
  const body = rest.slice(0, dot);
  if (rest.slice(dot + 1) !== await checkOf(body)) return { ok: false, reason: 'checksum' };
  let json: string;
  try {
    if (!sealed) json = fromUtf8(fromBase64Url(body));
    else {
      if (!passphrase) return { ok: false, reason: 'locked' };
      const w = JSON.parse(fromUtf8(fromBase64Url(body))) as { i: number; s: string; n: string; c: string };
      if (!Number.isInteger(w.i) || w.i < 1000 || w.i > 1_000_000) return { ok: false, reason: 'format' };
      const material = await crypto.subtle.importKey('raw', utf8(passphrase) as BufferSource, 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64Url(w.s) as BufferSource, iterations: w.i }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      try { json = fromUtf8(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(w.n) as BufferSource }, key, fromBase64Url(w.c) as BufferSource))); }
      catch { return { ok: false, reason: 'decrypt' }; }
    }
  } catch { return { ok: false, reason: 'format' }; }
  try {
    const d = JSON.parse(json) as { v?: number; guestId?: unknown; label?: unknown; syncKey?: unknown };
    if (d.v !== 1 || typeof d.guestId !== 'string' || typeof d.label !== 'string') return { ok: false, reason: 'format' };
    if (typeof d.syncKey !== 'string' || !SYNC_KEY_PATTERN.test(d.syncKey)) return { ok: false, reason: 'key' };
    return { ok: true, guestId: d.guestId.slice(0, 64), label: d.label.slice(0, 40) || 'Guest', syncKey: d.syncKey };
  } catch { return { ok: false, reason: 'format' }; }
}

/** Joins this device to the profile in a transfer code. The device id stays this device's own. */
export function joinProfile(joined: { guestId: string; label: string; syncKey: string }): GuestProfile {
  memory = store({ ...guestProfile(), guestId: joined.guestId, label: joined.label, syncKey: joined.syncKey });
  return memory;
}
