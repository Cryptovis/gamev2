import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import { canLoadSave, migrateSave } from '../persistence/migrations';
import { pickSnapshot, snapshotGame } from '../persistence/snapshot';
import { validSaveShape } from '../persistence/validation';
import { ENVELOPE_FORMAT, ENVELOPE_VERSION, envelopeShapeError, validLineage, validLineageState } from '../persistence/validation099';
import { fromBase64Url, sha256Hex, toBase64Url, toHex, utf8 } from '../cloud/bytes';
import { clearCloudConfig, cleanProjectUrl, readAutoSync, readCloudConfig, saveCloudConfig, validateConfig, writeAutoSync } from '../cloud/cloudConfig';
import { CloudConflictError, CloudDeniedError, CloudSetupError, CloudUnavailableError, MemoryCloudStore, SupabaseCloudStore, TABLE, type CloudRow } from '../cloud/cloudStore';
import { isEncrypted, openEnvelope, sealEnvelope, summarize, withLineage, type SaveEnvelope } from '../cloud/envelope';
import { enableCloudKey, guestProfile, joinProfile, leaveCloud, makeTransferCode, readTransferCode, resetGuestProfileCache, setGuestLabel } from '../cloud/guest';
import { CloudSyncService, planCampaign, type LocalCampaign, type LocalSaves, type MetaStore, type SyncMeta } from '../cloud/sync';
import { DexieLocalSaves, LocalStorageMeta } from '../cloud/localSaves';
import { derivePhase, overrideCloudForTests, pullCampaign, pushCampaign, refreshCloud, resolveCampaign, setCloudPassphrase, syncAllNow, turnOnCloudSaves, connectProject, useCloudView, turnOffCloudSaves, disconnectProject, setAutoSync, pushIfAhead } from '../cloud/cloudControl';
import { noteLocalSave, resetAutoSync } from '../cloud/autoSync';
import { db } from '../persistence/database';
import { saveGame, autosaveId } from '../persistence/saveGame';

const base = (id = 'camp-1', day?: number): GameState => {
  const s = makeInitialState();
  s.world.tutorial.active = false;
  s.world.campaignId = id;
  if (day) s.day = day;
  return s;
};
const ITER = 1000;
const seal = (state: GameState, extra: Partial<Parameters<typeof sealEnvelope>[1]> = {}) =>
  sealEnvelope(state, { campaignId: state.world.campaignId!, revision: 1, deviceId: 'dev-a', createdAt: 1_700_000_000_000, iterations: ITER, ...extra });
const makeStorage = () => {
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
vi.stubGlobal('localStorage', makeStorage());
vi.stubGlobal('sessionStorage', makeStorage());

const clearStorage = () => { try { localStorage.clear(); sessionStorage.clear(); } catch { /* none */ } resetGuestProfileCache(); };

describe('9.9 bytes and checksums', () => {
  it('round-trips base64url, including bytes that need padding and every byte value', () => {
    for (const n of [0, 1, 2, 3, 4, 31, 32, 33, 1000]) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256);
      const text = toBase64Url(bytes);
      expect(text).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(Array.from(fromBase64Url(text))).toEqual(Array.from(bytes));
    }
    expect(() => fromBase64Url('abc+/=')).toThrow();
  });
  it('hashes to the known SHA-256 vectors', async () => {
    expect(await sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
    expect(utf8('é').length).toBe(2);
  });
});

describe('9.9 the save envelope', () => {
  it('seals a campaign and opens it again unchanged', async () => {
    const state = base();
    const envelope = await seal(state);
    expect(envelope.format).toBe(ENVELOPE_FORMAT);
    expect(envelope.version).toBe(ENVELOPE_VERSION);
    expect(envelope.summary).toEqual(summarize(state));
    expect(envelope.encoding.cipher).toBe('none');
    expect(isEncrypted(envelope)).toBe(false);
    const opened = await openEnvelope(structuredClone(envelope));
    expect(opened.ok).toBe(true);
    if (opened.ok) expect(opened.state).toEqual(pickSnapshot(state));
  });

  it('compresses the payload when the runtime can', async () => {
    const state = base();
    const raw = utf8(JSON.stringify(pickSnapshot(state))).length;
    const plain = await seal(state, { compress: false });
    expect(plain.encoding.compression).toBe('none');
    expect(plain.bytes).toBe(raw);
    const packed = await seal(state);
    if (typeof CompressionStream === 'function') { expect(packed.encoding.compression).toBe('gzip'); expect(packed.bytes).toBeLessThan(raw / 3); }
    for (const e of [plain, packed]) expect((await openEnvelope(e)).ok).toBe(true);
  });

  it('encrypts under a passphrase, and the payload no longer contains the save', async () => {
    const state = base();
    const envelope = await seal(state, { passphrase: 'correct horse', compress: false });
    expect(isEncrypted(envelope)).toBe(true);
    expect(envelope.encoding.kdf).toMatchObject({ name: 'PBKDF2', hash: 'SHA-256', iterations: ITER });
    const text = new TextDecoder('latin1').decode(fromBase64Url(envelope.payload));
    expect(text).not.toContain(state.countries[state.playerCountryId].name);
    expect(text).not.toContain('campaignStatus');
    const opened = await openEnvelope(envelope, { passphrase: 'correct horse' });
    expect(opened.ok).toBe(true);
    if (opened.ok) expect(opened.state).toEqual(pickSnapshot(state));
  });

  it('asks for the passphrase and refuses a wrong one', async () => {
    const envelope = await seal(base(), { passphrase: 'secret' });
    expect(await openEnvelope(envelope)).toEqual({ ok: false, reason: 'locked' });
    expect(await openEnvelope(envelope, { passphrase: 'Secret' })).toEqual({ ok: false, reason: 'decrypt' });
    expect((await openEnvelope(envelope, { passphrase: 'secret' })).ok).toBe(true);
  });

  it('uses a fresh salt and nonce every time', async () => {
    const a = await seal(base(), { passphrase: 'p' }), b = await seal(base(), { passphrase: 'p' });
    expect(a.encoding.kdf!.salt).not.toBe(b.encoding.kdf!.salt);
    expect(a.encoding.iv).not.toBe(b.encoding.iv);
    expect(a.payload).not.toBe(b.payload);
  });

  it('catches a damaged payload or header before parsing anything', async () => {
    const envelope = await seal(base());
    const flipped = { ...envelope, payload: envelope.payload.slice(0, 20) + (envelope.payload[20] === 'A' ? 'B' : 'A') + envelope.payload.slice(21) };
    expect(await openEnvelope(flipped)).toEqual({ ok: false, reason: 'checksum' });
    expect(await openEnvelope({ ...envelope, payload: envelope.payload.slice(0, -8) })).toEqual({ ok: false, reason: 'checksum' });
    expect(await openEnvelope({ ...envelope, summary: { ...envelope.summary, day: envelope.summary.day + 1 } })).toEqual({ ok: false, reason: 'checksum' });
    expect(await openEnvelope({ ...envelope, revision: 9 })).toEqual({ ok: false, reason: 'checksum' });
    expect(await openEnvelope({ ...envelope, deviceId: 'dev-evil' })).toEqual({ ok: false, reason: 'checksum' });
  });

  it('binds the header to the ciphertext, so re-labelling an encrypted save fails even with a fixed-up checksum', async () => {
    const envelope = await seal(base(), { passphrase: 'p', compress: false });
    const moved = { ...envelope, revision: 7 };
    const head = JSON.stringify([moved.format, moved.version, moved.campaignId, moved.revision, moved.deviceId, moved.createdAt, moved.summary.day, moved.summary.schemaVersion, moved.encoding.compression, moved.encoding.cipher, moved.encoding.kdf!.iterations, moved.encoding.kdf!.salt, moved.encoding.iv]);
    moved.checksum = await sha256Hex(head + '\n' + moved.payload);
    expect(await openEnvelope(moved, { passphrase: 'p' })).toEqual({ ok: false, reason: 'decrypt' });
  });

  it('rejects things that are not envelopes, or are from a newer game', async () => {
    const envelope = await seal(base());
    expect(await openEnvelope(null)).toEqual({ ok: false, reason: 'format' });
    expect(await openEnvelope({ ...envelope, format: 'zip' })).toEqual({ ok: false, reason: 'format' });
    expect(await openEnvelope({ ...envelope, version: ENVELOPE_VERSION + 1 })).toEqual({ ok: false, reason: 'version' });
    expect(await openEnvelope({ ...envelope, summary: undefined })).toEqual({ ok: false, reason: 'header' });
    expect(await openEnvelope({ ...envelope, checksum: 'zz' })).toEqual({ ok: false, reason: 'header' });
    expect(await openEnvelope({ ...envelope, encoding: { compression: 'rot13', cipher: 'none' } })).toEqual({ ok: false, reason: 'header' });
  });

  it('refuses a save this build cannot load and an envelope that names another campaign', async () => {
    const old = { ...base(), schemaVersion: 1 } as GameState;
    expect(await openEnvelope(await seal(old))).toEqual({ ok: false, reason: 'incompatible' });
    expect(await openEnvelope(await seal(base('camp-1'), { campaignId: 'camp-2' }))).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('carries the lineage stamped into the save', async () => {
    const state = withLineage(base(), { baseRevision: 4, deviceId: 'dev-a', syncedDay: base().day });
    const opened = await openEnvelope(await seal(state, { revision: 4 }));
    expect(opened.ok && opened.state.world.lineage).toEqual({ baseRevision: 4, deviceId: 'dev-a', syncedDay: state.day });
  });

  it('does not clone the whole save to seal it', () => {
    const state = base();
    expect(pickSnapshot(state).countries).toBe(state.countries);
    expect(snapshotGame(state).countries).not.toBe(state.countries);
    expect(snapshotGame(state)).toEqual(pickSnapshot(state));
  });
});

describe('9.9 validation099: lineage and the envelope header', () => {
  it('accepts saves with and without a lineage', () => {
    const s = base();
    expect(validSaveShape(s)).toBe(true);
    expect(validSaveShape(withLineage(s, { baseRevision: 3, deviceId: 'dev-x_1.2', syncedDay: s.day }))).toBe(true);
    expect(validSaveShape(withLineage(s, { baseRevision: 0, deviceId: 'd', syncedDay: 0 }))).toBe(true);
  });

  it('refuses a lineage that cannot be true', () => {
    const s = base();
    const bad = (lineage: unknown) => validSaveShape({ ...s, world: { ...s.world, lineage } });
    expect(bad(7)).toBe(false);
    expect(bad(null)).toBe(false);
    expect(bad([])).toBe(false);
    expect(bad({ baseRevision: -1, deviceId: 'd', syncedDay: 1 })).toBe(false);
    expect(bad({ baseRevision: 1.5, deviceId: 'd', syncedDay: 1 })).toBe(false);
    expect(bad({ baseRevision: 1, deviceId: 'two words', syncedDay: 1 })).toBe(false);
    expect(bad({ baseRevision: 1, deviceId: '', syncedDay: 1 })).toBe(false);
    expect(bad({ baseRevision: 1, deviceId: 'x'.repeat(65), syncedDay: 1 })).toBe(false);
    expect(bad({ baseRevision: 1, deviceId: 'd', syncedDay: s.day + 1 })).toBe(false);
    expect(bad({ baseRevision: 1, deviceId: 'd' })).toBe(false);
    expect(validLineageState({ day: 5, world: {} })).toBe(true);
    expect(validLineage({ baseRevision: 1, deviceId: 'd', syncedDay: 5 }, 4)).toBe(false);
  });

  it('loads a save from before the lineage existed, and keeps a lineage through a save and a load', () => {
    const s = base();
    expect('lineage' in s.world).toBe(false);
    const loaded = migrateSave(structuredClone(s));
    expect(loaded && canLoadSave(loaded)).toBe(true);
    expect(loaded!.world.lineage).toBeUndefined();
    const stamped = withLineage(s, { baseRevision: 2, deviceId: 'dev-a', syncedDay: s.day });
    expect(migrateSave(snapshotGame(stamped))!.world.lineage).toEqual({ baseRevision: 2, deviceId: 'dev-a', syncedDay: s.day });
  });

  it('checks an envelope header field by field', async () => {
    const e = await seal(base(), { passphrase: 'p' });
    expect(envelopeShapeError(e)).toBeNull();
    const without = (key: keyof SaveEnvelope) => { const c = { ...e } as Record<string, unknown>; delete c[key]; return c; };
    for (const key of ['campaignId', 'revision', 'deviceId', 'createdAt', 'summary', 'encoding', 'payload', 'bytes', 'checksum'] as const) expect(envelopeShapeError(without(key))).toBe('header');
    expect(envelopeShapeError({ ...e, revision: 0 })).toBe('header');
    expect(envelopeShapeError({ ...e, campaignId: '' })).toBe('header');
    expect(envelopeShapeError({ ...e, bytes: 64 * 1024 * 1024 + 1 })).toBe('header');
    expect(envelopeShapeError({ ...e, createdAt: -1 })).toBe('header');
    expect(envelopeShapeError({ ...e, encoding: { ...e.encoding, iv: 'short' } })).toBe('header');
    expect(envelopeShapeError({ ...e, encoding: { ...e.encoding, kdf: { ...e.encoding.kdf!, iterations: 10 } } })).toBe('header');
    expect(envelopeShapeError({ ...e, encoding: { ...e.encoding, kdf: { ...e.encoding.kdf!, iterations: 5_000_000 } } })).toBe('header');
    expect(envelopeShapeError({ ...e, summary: { ...e.summary, campaignStatus: 'draw' } })).toBe('header');
    expect(envelopeShapeError([])).toBe('format');
  });
});

describe('9.9 the guest profile and the transfer code', () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('creates one profile per browser and remembers it', () => {
    const a = guestProfile(123);
    expect(a.createdAt).toBe(123);
    expect(a.syncKey).toBeNull();
    expect(a.guestId).toMatch(/^guest-/);
    expect(a.deviceId).toMatch(/^dev-/);
    resetGuestProfileCache();
    expect(guestProfile()).toEqual(a);
  });

  it('mints a sync key once, and forgets it when the player leaves', () => {
    const on = enableCloudKey();
    expect(on.syncKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(enableCloudKey().syncKey).toBe(on.syncKey);
    expect(leaveCloud().syncKey).toBeNull();
    expect(enableCloudKey().syncKey).not.toBe(on.syncKey);
  });

  it('names the profile within limits', () => {
    expect(setGuestLabel('  Ada  ').label).toBe('Ada');
    expect(setGuestLabel('x'.repeat(100)).label.length).toBe(40);
    expect(setGuestLabel('   ').label).toBe('Guest');
  });

  it('ignores a damaged stored profile and starts afresh', () => {
    localStorage.setItem('ron-guest-profile-v1', '{"guestId":1}');
    resetGuestProfileCache();
    expect(guestProfile().guestId).toMatch(/^guest-/);
    localStorage.setItem('ron-guest-profile-v1', JSON.stringify({ guestId: 'g', deviceId: 'd', label: 'x', createdAt: 1, syncKey: 'short' }));
    resetGuestProfileCache();
    expect(guestProfile().syncKey).toBeNull();
  });

  it('carries the profile to another device in a plain code', async () => {
    const p = enableCloudKey();
    const code = await makeTransferCode(p);
    expect(code.startsWith('RON-SYNC-1:')).toBe(true);
    const read = await readTransferCode(code);
    expect(read).toEqual({ ok: true, guestId: p.guestId, label: p.label, syncKey: p.syncKey });
  });

  it('seals the code under a passphrase', async () => {
    const p = enableCloudKey();
    const code = await makeTransferCode(p, 'blue heron', ITER);
    expect(code.startsWith('RON-SYNC-1E:')).toBe(true);
    expect(code).not.toContain(p.syncKey!);
    expect(await readTransferCode(code)).toEqual({ ok: false, reason: 'locked' });
    expect(await readTransferCode(code, 'red heron')).toEqual({ ok: false, reason: 'decrypt' });
    expect(await readTransferCode(code, 'blue heron')).toMatchObject({ ok: true, syncKey: p.syncKey });
  });

  it('catches a mistyped code and junk', async () => {
    const code = await makeTransferCode(enableCloudKey());
    const typo = code.slice(0, 20) + (code[20] === 'a' ? 'b' : 'a') + code.slice(21);
    expect(await readTransferCode(typo)).toEqual({ ok: false, reason: 'checksum' });
    expect(await readTransferCode('hello')).toEqual({ ok: false, reason: 'format' });
    expect(await readTransferCode('RON-SYNC-1:nodot')).toEqual({ ok: false, reason: 'format' });
    const body = toBase64Url(utf8(JSON.stringify({ v: 1, guestId: 'g', label: 'x', syncKey: 'not-a-key' })));
    expect(await readTransferCode(`RON-SYNC-1:${body}.${(await sha256Hex(body)).slice(0, 6)}`)).toEqual({ ok: false, reason: 'key' });
    expect(await readTransferCode('  ' + code + '\n')).toMatchObject({ ok: true });
  });

  it('refuses to make a code before cloud saves are on', async () => {
    await expect(makeTransferCode(guestProfile())).rejects.toThrow();
  });

  it('joins a second device to the profile without sharing the device id', async () => {
    const first = enableCloudKey();
    const code = await makeTransferCode(first);
    clearStorage();
    const second = guestProfile();
    const read = await readTransferCode(code);
    if (!read.ok) throw new Error('code unreadable');
    const joined = joinProfile(read);
    expect(joined.syncKey).toBe(first.syncKey);
    expect(joined.guestId).toBe(first.guestId);
    expect(joined.deviceId).toBe(second.deviceId);
    expect(joined.deviceId).not.toBe(first.deviceId);
    resetGuestProfileCache();
    expect(guestProfile().syncKey).toBe(first.syncKey);
  });
});

describe('9.9 the project settings', () => {
  beforeEach(clearStorage);
  afterEach(clearStorage);
  const KEY = 'k'.repeat(40);

  it('accepts https project URLs and plain http only for a local server', () => {
    expect(cleanProjectUrl('https://abc.supabase.co')).toBe('https://abc.supabase.co');
    expect(cleanProjectUrl(' https://abc.supabase.co/ ')).toBe('https://abc.supabase.co');
    expect(cleanProjectUrl('http://localhost:54321')).toBe('http://localhost:54321');
    expect(cleanProjectUrl('http://127.0.0.1:54321/')).toBe('http://127.0.0.1:54321');
    for (const bad of ['http://abc.supabase.co', 'ftp://x.y', 'abc', '', 'https://u:p@abc.supabase.co', 'https://abc.supabase.co?x=1', 'https://abc.supabase.co#a', 'javascript:alert(1)']) expect(cleanProjectUrl(bad)).toBeNull();
  });

  it('wants a plausible project key', () => {
    expect(validateConfig({ url: 'https://a.b.co', anonKey: KEY })).toEqual({ url: 'https://a.b.co', anonKey: KEY });
    expect(validateConfig({ url: 'https://a.b.co', anonKey: 'short' })).toBeNull();
    expect(validateConfig({ url: 'https://a.b.co', anonKey: 'has space ' + KEY })).toBeNull();
    expect(validateConfig(null)).toBeNull();
    expect(validateConfig({ url: 3 as never, anonKey: KEY })).toBeNull();
  });

  it('stores, reads and clears the project settings, and the automatic-upload switch', () => {
    expect(readCloudConfig()).toBeNull();
    expect(saveCloudConfig({ url: 'nope', anonKey: KEY })).toBeNull();
    expect(readCloudConfig()).toBeNull();
    expect(saveCloudConfig({ url: 'https://a.b.co/', anonKey: KEY })).toEqual({ url: 'https://a.b.co', anonKey: KEY });
    expect(readCloudConfig()).toEqual({ url: 'https://a.b.co', anonKey: KEY });
    clearCloudConfig();
    expect(readCloudConfig()).toBeNull();
    expect(readAutoSync()).toBe(false);
    writeAutoSync(true);
    expect(readAutoSync()).toBe(true);
  });
});

/** A PostgREST double that enforces the same row-level rule as the migration: a request sees only rows whose owner_key is the SHA-256 of its x-ron-sync-key. */
function fakeSupabase() {
  type Row = Record<string, unknown> & { owner_key: string; campaign_id: string; revision: number };
  const rows = new Map<string, Row>();
  const requests: { method: string; url: string; headers: Record<string, string>; body?: Row }[] = [];
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const state = { mode: 'ok' as 'ok' | 'denied' | 'missing' | 'offline' | 'broken' };
  const fetchImpl = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const method = init.method ?? 'GET', headers = init.headers as Record<string, string>;
    const body = init.body ? JSON.parse(String(init.body)) as Row : undefined;
    requests.push({ method, url, headers, body });
    if (state.mode === 'offline') throw new TypeError('Failed to fetch');
    if (state.mode === 'denied') return json({}, 401);
    if (state.mode === 'missing') return json({ code: 'PGRST205' }, 404);
    if (state.mode === 'broken') return json({}, 503);
    const u = new URL(url);
    if (!u.pathname.endsWith(`/rest/v1/${TABLE}`)) return json({}, 404);
    const caller = await sha256Hex(headers['x-ron-sync-key'] ?? '');
    const eq = (k: string) => u.searchParams.get(k)?.replace(/^eq\./, '');
    const mine = () => [...rows.values()].filter(r => r.owner_key === caller && (!eq('owner_key') || r.owner_key === eq('owner_key')) && (!eq('campaign_id') || r.campaign_id === eq('campaign_id')) && (!eq('revision') || String(r.revision) === eq('revision')));
    if (method === 'GET') {
      const cols = u.searchParams.get('select')!.split(',');
      return json(mine().map(r => Object.fromEntries(cols.map(c => [c, r[c]]))));
    }
    if (method === 'POST') {
      if (body!.owner_key !== caller) return json({}, 403);
      const key = body!.owner_key + '|' + body!.campaign_id;
      if (rows.has(key)) return json({ code: '23505' }, 409);
      rows.set(key, body!);
      return json([body], 201);
    }
    if (method === 'PATCH') {
      const hit = mine();
      for (const r of hit) Object.assign(r, body);
      return json(hit);
    }
    if (method === 'DELETE') {
      const hit = mine();
      for (const r of hit) rows.delete(r.owner_key + '|' + r.campaign_id);
      return json(hit);
    }
    return json({}, 405);
  };
  return { rows, requests, state, fetchImpl };
}

describe('9.9 the Supabase client', () => {
  const config = { url: 'https://proj.supabase.co', anonKey: 'anon-' + 'x'.repeat(40) };
  const KEY_A = 'A'.repeat(43), KEY_B = 'B'.repeat(43);

  it('lists, writes, reads and deletes through PostgREST with the profile key on every request', async () => {
    const server = fakeSupabase(), store = new SupabaseCloudStore(config, KEY_A, server.fetchImpl);
    expect(await store.list()).toEqual([]);
    const e1 = await seal(base('c1'));
    const row = await store.put(e1, 0);
    expect(row).toMatchObject({ campaignId: 'c1', revision: 1, deviceId: 'dev-a', day: e1.summary.day });
    expect(await store.get('c1')).toEqual(e1);
    expect((await store.list()).map(r => r.campaignId)).toEqual(['c1']);
    const e2 = await seal(base('c1', 20), { revision: 2 });
    expect((await store.put(e2, 1)).revision).toBe(2);
    expect((await store.get('c1'))!.revision).toBe(2);
    await store.remove('c1', 2);
    expect(await store.get('c1')).toBeNull();
    for (const r of server.requests) {
      expect(r.headers.apikey).toBe(config.anonKey);
      expect(r.headers.Authorization).toBe(`Bearer ${config.anonKey}`);
      expect(r.headers['x-ron-sync-key']).toBe(KEY_A);
      expect(r.url.startsWith(`${config.url}/rest/v1/${TABLE}`)).toBe(true);
    }
    const owner = await sha256Hex(KEY_A);
    expect(server.requests.every(r => r.url.includes(`owner_key=eq.${owner}`) || r.method === 'POST')).toBe(true);
    expect(JSON.stringify(server.requests)).not.toContain(`"owner_key":"${KEY_A}"`);
  });

  it('keeps one profile out of another', async () => {
    const server = fakeSupabase();
    const a = new SupabaseCloudStore(config, KEY_A, server.fetchImpl), b = new SupabaseCloudStore(config, KEY_B, server.fetchImpl);
    await a.put(await seal(base('c1')), 0);
    expect(await b.list()).toEqual([]);
    expect(await b.get('c1')).toBeNull();
    // The other profile may use the same campaign id for its own save.
    await b.put(await seal(base('c1', 30)), 0);
    expect((await a.get('c1'))!.summary.day).not.toBe(30);
  });

  it('refuses a write that was based on an old revision', async () => {
    const server = fakeSupabase(), store = new SupabaseCloudStore(config, KEY_A, server.fetchImpl);
    await store.put(await seal(base('c1')), 0);
    await expect(store.put(await seal(base('c1')), 0)).rejects.toBeInstanceOf(CloudConflictError);
    await store.put(await seal(base('c1'), { revision: 2 }), 1);
    const late = store.put(await seal(base('c1'), { revision: 2 }), 1);
    await expect(late).rejects.toMatchObject({ name: 'CloudConflictError', currentRevision: 2 });
    await expect(store.remove('c1', 1)).rejects.toBeInstanceOf(CloudConflictError);
    expect((await store.list()).length).toBe(1);
  });

  it('turns the ways a network can fail into errors the sync can act on', async () => {
    const server = fakeSupabase(), store = new SupabaseCloudStore(config, KEY_A, server.fetchImpl);
    server.state.mode = 'offline';
    await expect(store.list()).rejects.toMatchObject({ name: 'CloudUnavailableError', offline: true });
    server.state.mode = 'denied';
    await expect(store.list()).rejects.toBeInstanceOf(CloudDeniedError);
    server.state.mode = 'missing';
    await expect(store.list()).rejects.toBeInstanceOf(CloudSetupError);
    server.state.mode = 'broken';
    await expect(store.list()).rejects.toMatchObject({ name: 'CloudUnavailableError', offline: false });
  });

  it('does not trust a row from the network until it looks like an envelope', async () => {
    const server = fakeSupabase(), store = new SupabaseCloudStore(config, KEY_A, server.fetchImpl);
    const owner = await sha256Hex(KEY_A);
    server.rows.set(`${owner}|c9`, { owner_key: owner, campaign_id: 'c9', revision: 1, envelope: { format: 'ron-save-envelope', version: 1, hax: true } });
    await expect(store.get('c9')).rejects.toBeInstanceOf(CloudUnavailableError);
  });

  it('escapes campaign ids in the query', async () => {
    const server = fakeSupabase(), store = new SupabaseCloudStore(config, KEY_A, server.fetchImpl);
    await store.get('a&b=c');
    expect(server.requests[0].url).toContain('campaign_id=eq.a%26b%3Dc');
  });
});

describe('9.9 the in-memory cloud', () => {
  it('versions writes and refuses stale ones', async () => {
    const store = new MemoryCloudStore(() => 5), e = await seal(base('c1'));
    expect((await store.put(e, 0)).updatedAt).toBe(5);
    await expect(store.put(e, 0)).rejects.toBeInstanceOf(CloudConflictError);
    expect((await store.get('c1'))).toEqual(e);
    (await store.get('c1'))!.payload = 'changed';
    expect((await store.get('c1'))!.payload).toBe(e.payload);
    await expect(store.remove('c1', 9)).rejects.toBeInstanceOf(CloudConflictError);
    await store.remove('c1', 1);
    expect(await store.list()).toEqual([]);
  });
  it('fails on demand, once or for good', async () => {
    const store = new MemoryCloudStore();
    store.failWith = new CloudUnavailableError('down', true);
    await expect(store.list()).rejects.toBeInstanceOf(CloudUnavailableError);
    expect(await store.list()).toEqual([]);
    store.failWith = new CloudUnavailableError('down', true); store.sticky = true;
    await expect(store.list()).rejects.toBeInstanceOf(CloudUnavailableError);
    await expect(store.list()).rejects.toBeInstanceOf(CloudUnavailableError);
  });
});

describe('9.9 where a campaign stands', () => {
  const local = (over: Partial<LocalCampaign> = {}): LocalCampaign => ({ campaignId: 'c', recordId: 'r', name: 'n', updatedAt: 100, summary: summarize(base()), baseRevision: 0, ...over });
  const remote = (revision: number): CloudRow => ({ campaignId: 'c', revision, deviceId: 'd', updatedAt: 1, day: 1, schemaVersion: 1, bytes: 1, checksum: '0'.repeat(64), summary: summarize(base()) });
  const meta = (revision: number, localUpdatedAt = 100): SyncMeta => ({ revision, localUpdatedAt, checksum: '', syncedAt: 1 });

  it('covers every case with a record of the last sync', () => {
    expect(planCampaign(null, null, null)).toBe('synced');
    expect(planCampaign(local(), null, null)).toBe('local-only');
    expect(planCampaign(null, remote(2), null)).toBe('cloud-only');
    expect(planCampaign(local(), remote(2), meta(2))).toBe('synced');
    expect(planCampaign(local({ updatedAt: 101 }), remote(2), meta(2))).toBe('local-ahead');
    expect(planCampaign(local(), remote(3), meta(2))).toBe('cloud-ahead');
    expect(planCampaign(local({ updatedAt: 101 }), remote(3), meta(2))).toBe('conflict');
  });

  it('falls back on the save’s own lineage when this device has no record', () => {
    expect(planCampaign(local({ baseRevision: 2 }), remote(2), null)).toBe('synced');
    expect(planCampaign(local({ baseRevision: 2 }), remote(3), null)).toBe('conflict');
    expect(planCampaign(local({ baseRevision: 0 }), remote(1), null)).toBe('conflict');
  });
});

class MemoryLocal implements LocalSaves {
  records = new Map<string, { state: GameState; updatedAt: number; name: string }>();
  clock = 1000;
  async campaigns(): Promise<LocalCampaign[]> {
    return [...this.records].map(([campaignId, r]) => ({ campaignId, recordId: 'autosave:' + campaignId, name: r.name, updatedAt: r.updatedAt, summary: summarize(r.state), baseRevision: r.state.world.lineage?.baseRevision ?? 0 }));
  }
  async read(id: string) { const r = this.records.get(id); return r ? structuredClone(r.state) : null; }
  async write(state: GameState, id: string, name: string) { const t = ++this.clock; this.records.set(id, { state: structuredClone(state), updatedAt: t, name }); return t; }
  /** The player keeps playing: the autosave is rewritten, a few days on. */
  play(id: string, days = 1) { const r = this.records.get(id)!; this.records.set(id, { ...r, state: { ...r.state, day: r.state.day + days }, updatedAt: ++this.clock }); }
}
class MemoryMeta implements MetaStore {
  data: Record<string, SyncMeta> = {};
  read() { return structuredClone(this.data); }
  write(id: string, m: SyncMeta | null) { if (m) this.data[id] = m; else delete this.data[id]; }
}

function device(cloud: MemoryCloudStore, name: string, shared: { pass?: string } = {}) {
  const local = new MemoryLocal(), meta = new MemoryMeta();
  let tick = 0, copies = 0;
  const svc = new CloudSyncService({ cloud, local, meta, deviceId: name, now: () => ++tick, passphrase: () => shared.pass, newId: () => `${name}-copy-${++copies}`, iterations: ITER });
  return { svc, local, meta, shared };
}

describe('9.9 syncing campaigns between devices', () => {
  it('uploads a new campaign, then sees it as in step', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a');
    await a.local.write(base('c1'), 'c1', 'x');
    expect((await a.svc.refresh())[0].status).toBe('local-only');
    expect(await a.svc.push('c1')).toEqual({ ok: true, campaignId: 'c1', action: 'push', revision: 1 });
    expect((await a.svc.refresh())[0].status).toBe('synced');
    expect(a.meta.data.c1.revision).toBe(1);
    expect((await cloud.list())[0]).toMatchObject({ campaignId: 'c1', revision: 1, deviceId: 'dev-a' });
    expect(await a.svc.push('c1')).toMatchObject({ ok: true, action: 'none' });
    expect(cloud.calls.filter(c => c === 'put').length).toBe(1);
  });

  it('carries a campaign to a second device, which then continues from it', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a'), b = device(cloud, 'dev-b');
    await a.local.write(base('c1', 12), 'c1', 'x');
    await a.svc.push('c1');
    expect((await b.svc.refresh())[0].status).toBe('cloud-only');
    expect(await b.svc.pull('c1')).toMatchObject({ ok: true, action: 'pull', revision: 1 });
    const pulled = (await b.local.read('c1'))!;
    expect(pulled.day).toBe(12);
    expect(pulled.world.lineage).toEqual({ baseRevision: 1, deviceId: 'dev-a', syncedDay: 12 });
    expect(pulled.countries).toEqual(base('c1', 12).countries);
    expect((await b.svc.refresh())[0].status).toBe('synced');
    b.local.play('c1', 5);
    expect((await b.svc.refresh())[0].status).toBe('local-ahead');
    expect(await b.svc.push('c1')).toMatchObject({ ok: true, revision: 2 });
    expect((await a.svc.refresh())[0].status).toBe('cloud-ahead');
    expect(await a.svc.pull('c1')).toMatchObject({ ok: true, revision: 2 });
    expect((await a.local.read('c1'))!.day).toBe(17);
    expect((await a.svc.refresh())[0].status).toBe('synced');
  });

  it('does not decide between two histories: both devices played on, so it is a conflict', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a'), b = device(cloud, 'dev-b');
    await a.local.write(base('c1', 10), 'c1', 'x');
    await a.svc.push('c1');
    await b.svc.pull('c1');
    a.local.play('c1', 3);
    b.local.play('c1', 7);
    expect(await b.svc.push('c1')).toMatchObject({ ok: true, revision: 2 });
    expect((await a.svc.refresh())[0].status).toBe('conflict');
    expect(await a.svc.push('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'conflict' });
    expect((await cloud.get('c1'))!.summary.day).toBe(17);
    const all = await a.svc.syncAll();
    expect(all).toEqual([]);
    expect((await a.local.read('c1'))!.day).toBe(13);
  });

  it('settles a conflict in favour of this device', async () => {
    const { cloud, a, b } = await conflict();
    expect(await a.svc.resolve('c1', 'local')).toMatchObject({ ok: true, action: 'push', revision: 3 });
    expect((await cloud.get('c1'))!.summary.day).toBe(13);
    expect((await a.svc.refresh())[0].status).toBe('synced');
    // The other device has not played since it uploaded, so it is simply behind now.
    expect((await b.svc.refresh())[0].status).toBe('cloud-ahead');
  });

  it('settles a conflict in favour of the cloud', async () => {
    const { a } = await conflict();
    expect(await a.svc.resolve('c1', 'cloud')).toMatchObject({ ok: true, action: 'pull', revision: 2 });
    expect((await a.local.read('c1'))!.day).toBe(17);
    expect((await a.svc.refresh())[0].status).toBe('synced');
  });

  it('keeps both: the cloud’s copy becomes a separate campaign here, and this device’s version goes up', async () => {
    const { cloud, a } = await conflict();
    const outcome = await a.svc.resolve('c1', 'both');
    expect(outcome).toMatchObject({ ok: true, action: 'push', revision: 3, copyId: 'dev-a-copy-1' });
    const copy = (await a.local.read('dev-a-copy-1'))!;
    expect(copy.day).toBe(17);
    expect(copy.world.campaignId).toBe('dev-a-copy-1');
    expect(copy.world.lineage).toBeUndefined();
    expect((await a.local.read('c1'))!.day).toBe(13);
    expect((await cloud.get('c1'))!.summary.day).toBe(13);
    const rows = await a.svc.refresh();
    expect(rows.find(r => r.campaignId === 'c1')!.status).toBe('synced');
    expect(rows.find(r => r.campaignId === 'dev-a-copy-1')!.status).toBe('local-only');
  });

  async function conflict() {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a'), b = device(cloud, 'dev-b');
    await a.local.write(base('c1', 10), 'c1', 'x');
    await a.svc.push('c1'); await b.svc.pull('c1');
    a.local.play('c1', 3); b.local.play('c1', 7);
    await b.svc.push('c1');
    return { cloud, a, b };
  }

  it('loses the race cleanly when another device writes between the look and the write', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a'), b = device(cloud, 'dev-b');
    await a.local.write(base('c1', 10), 'c1', 'x');
    await a.svc.push('c1'); await b.svc.pull('c1');
    a.local.play('c1', 2); b.local.play('c1', 2);
    const real = cloud.put.bind(cloud);
    cloud.put = async (e, expected) => { cloud.put = real; await b.svc.push('c1'); return real(e, expected); };
    expect(await a.svc.push('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'conflict' });
    expect((await cloud.list())[0].deviceId).toBe('dev-b');
    expect(a.meta.data.c1.revision).toBe(1);
  });

  it('syncs everything that is ahead in either direction and leaves the rest', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a'), b = device(cloud, 'dev-b');
    for (const id of ['up', 'down', 'both', 'same']) await a.local.write(base(id, 10), id, id);
    for (const id of ['up', 'down', 'both', 'same']) await a.svc.push(id);
    for (const id of ['down', 'both', 'same']) await b.svc.pull(id);
    b.local.play('down', 4);                        // b is ahead on "down"
    await b.svc.push('down');
    a.local.play('up', 2);                          // a is ahead on "up"
    a.local.play('both', 1); b.local.play('both', 1); await b.svc.push('both');   // conflict on "both"
    await b.local.write(base('theirs', 10), 'theirs', 't'); await b.svc.push('theirs');   // only on the cloud as far as a is concerned
    const out = await a.svc.syncAll();
    const by = Object.fromEntries(out.map(o => [o.campaignId, o]));
    expect(by.up).toMatchObject({ ok: true, action: 'push' });
    expect(by.down).toMatchObject({ ok: true, action: 'pull' });
    expect(by.both).toBeUndefined();
    expect(by.same).toBeUndefined();
    expect(by.theirs).toBeUndefined();
    const statuses = Object.fromEntries((await a.svc.refresh()).map(r => [r.campaignId, r.status]));
    expect(statuses).toMatchObject({ up: 'synced', down: 'synced', both: 'conflict', same: 'synced', theirs: 'cloud-only' });
  });

  it('encrypts when a passphrase is set, and shows the other device only what its passphrase opens', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a', { pass: 'hunter2' }), b = device(cloud, 'dev-b');
    await a.local.write(base('c1', 10), 'c1', 'x');
    await a.svc.push('c1');
    expect(isEncrypted((await cloud.get('c1'))!)).toBe(true);
    expect(await b.svc.pull('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'locked' });
    b.shared.pass = 'wrong';
    expect(await b.svc.pull('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'wrong-passphrase' });
    b.shared.pass = 'hunter2';
    expect(await b.svc.pull('c1')).toMatchObject({ ok: true });
    expect((await b.local.read('c1'))!.day).toBe(10);
  });

  it('does not touch the local save when the cloud copy is damaged, from a newer game, or unreadable', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a'), b = device(cloud, 'dev-b');
    await a.local.write(base('c1', 10), 'c1', 'x');
    await a.svc.push('c1');
    await b.local.write(base('c1', 99), 'c1', 'mine');
    const before = (await b.local.read('c1'))!;
    cloud.tamper('c1', e => ({ ...e, payload: e.payload.slice(0, -4) + 'AAAA' }));
    expect(await b.svc.pull('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'corrupt' });
    cloud.tamper('c1', e => ({ ...e, version: ENVELOPE_VERSION + 1 }));
    expect(await b.svc.pull('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'newer-game' });
    cloud.tamper('c1', () => ({ nonsense: true } as unknown as SaveEnvelope));
    expect(await b.svc.pull('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'corrupt' });
    expect(await b.local.read('c1')).toEqual(before);
    expect(b.meta.data.c1).toBeUndefined();
  });

  it('reports why the cloud could not be used', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a');
    await a.local.write(base('c1'), 'c1', 'x');
    cloud.failWith = new CloudUnavailableError('x', true);
    expect(await a.svc.push('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'offline' });
    cloud.failWith = new CloudUnavailableError('x', false);
    expect(await a.svc.push('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'unavailable' });
    cloud.failWith = new CloudDeniedError();
    expect(await a.svc.push('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'denied' });
    cloud.failWith = new CloudSetupError();
    expect(await a.svc.pull('c1')).toEqual({ ok: false, campaignId: 'c1', reason: 'setup' });
    cloud.failWith = new CloudUnavailableError('x', true);
    expect(await a.svc.syncAll()).toEqual([{ ok: false, campaignId: '*', reason: 'offline' }]);
    expect(await a.svc.push('missing')).toEqual({ ok: false, campaignId: 'missing', reason: 'nothing' });
    expect(await a.svc.pull('missing')).toEqual({ ok: false, campaignId: 'missing', reason: 'nothing' });
  });

  it('removes the cloud copy and goes back to local-only', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a');
    await a.local.write(base('c1'), 'c1', 'x');
    await a.svc.push('c1');
    expect(await a.svc.removeFromCloud('c1')).toMatchObject({ ok: true });
    expect(a.meta.data.c1).toBeUndefined();
    expect((await a.svc.refresh())[0].status).toBe('local-only');
  });

  it('never writes the lineage into the local save it pushed from', async () => {
    const cloud = new MemoryCloudStore(), a = device(cloud, 'dev-a');
    await a.local.write(base('c1'), 'c1', 'x');
    await a.svc.push('c1');
    expect((await a.local.read('c1'))!.world.lineage).toBeUndefined();
    const opened = await openEnvelope((await cloud.get('c1'))!);
    expect(opened.ok && opened.state.world.lineage).toMatchObject({ baseRevision: 1, deviceId: 'dev-a' });
  });
});

describe('9.9 the Options window’s cloud actions', () => {
  const KEY = 'k'.repeat(40);
  let cloud: MemoryCloudStore, local: MemoryLocal, meta: MemoryMeta;
  beforeEach(() => {
    clearStorage();
    cloud = new MemoryCloudStore(); local = new MemoryLocal(); meta = new MemoryMeta();
    overrideCloudForTests({ cloud, local, meta, iterations: ITER });
    saveCloudConfig({ url: 'https://p.supabase.co', anonKey: KEY });
    turnOnCloudSaves();
  });
  afterEach(() => { overrideCloudForTests(null); resetAutoSync(); setCloudPassphrase(''); clearStorage(); disconnectProject(); });

  it('shows what is missing before anything can sync', () => {
    overrideCloudForTests(null);
    disconnectProject();
    expect(useCloudView.getState().phase).toBe('unconfigured');
    expect(connectProject('nope', KEY)).toBe(false);
    expect(useCloudView.getState().error).toBe('setup-config');
    expect(connectProject('https://p.supabase.co', KEY)).toBe(true);
    turnOffCloudSaves();
    expect(useCloudView.getState().phase).toBe('no-key');
    turnOnCloudSaves();
    expect(useCloudView.getState().phase).toBe('idle');
    expect(useCloudView.getState().hasKey).toBe(true);
  });

  it('derives the phase from the table, the connection and the last error', () => {
    const row = (status: string) => ({ status } as never);
    const d = (over: Partial<Parameters<typeof derivePhase>[0]> = {}) => derivePhase({ configured: true, hasKey: true, busy: false, online: true, error: null, rows: [], ...over });
    expect(d({ configured: false })).toBe('unconfigured');
    expect(d({ hasKey: false })).toBe('no-key');
    expect(d({ busy: true })).toBe('syncing');
    expect(d({ error: 'locked' })).toBe('locked');
    expect(d({ error: 'wrong-passphrase' })).toBe('locked');
    expect(d({ online: false })).toBe('offline');
    expect(d({ error: 'offline' })).toBe('offline');
    expect(d({ error: 'denied' })).toBe('error');
    expect(d({ rows: [row('synced'), row('conflict')] })).toBe('conflict');
    expect(d({ rows: [row('synced'), row('cloud-only')] })).toBe('synced');
    expect(d({ rows: [row('synced'), row('local-ahead')] })).toBe('idle');
    expect(d()).toBe('idle');
  });

  it('uploads, lists and reports the phase', async () => {
    await local.write(base('c1'), 'c1', 'x');
    await refreshCloud();
    expect(useCloudView.getState().rows[0].status).toBe('local-only');
    expect(useCloudView.getState().phase).toBe('idle');
    await pushCampaign('c1');
    const view = useCloudView.getState();
    expect(view.phase).toBe('synced');
    expect(view.rows[0].status).toBe('synced');
    expect(view.last).toMatchObject({ ok: true, action: 'push' });
    expect(view.busy).toBeNull();
    expect(view.lastSyncAt).not.toBeNull();
  });

  it('keeps a conflict visible until the player settles it', async () => {
    await local.write(base('c1', 10), 'c1', 'x');
    await pushCampaign('c1');
    const other = device(cloud, 'dev-b');
    await other.svc.pull('c1'); other.local.play('c1', 5); await other.svc.push('c1');
    local.play('c1', 2);
    await syncAllNow();
    expect(useCloudView.getState().phase).toBe('conflict');
    await pushCampaign('c1');
    expect(useCloudView.getState().phase).toBe('conflict');
    await resolveCampaign('c1', 'cloud');
    expect(useCloudView.getState().phase).toBe('synced');
    expect((await local.read('c1'))!.day).toBe(15);
  });

  it('says offline, then recovers', async () => {
    await local.write(base('c1'), 'c1', 'x');
    cloud.failWith = new CloudUnavailableError('x', true);
    await refreshCloud();
    expect(useCloudView.getState().phase).toBe('offline');
    await refreshCloud();
    expect(useCloudView.getState().phase).toBe('idle');
  });

  it('locks on an encrypted save until the passphrase is given', async () => {
    const other = device(cloud, 'dev-b', { pass: 'pw' });
    await other.local.write(base('c1', 10), 'c1', 'x');
    await other.svc.push('c1');
    await pullCampaign('c1');
    expect(useCloudView.getState().phase).toBe('locked');
    setCloudPassphrase('pw');
    expect(useCloudView.getState().encrypted).toBe(true);
    expect(useCloudView.getState().error).toBeNull();
    await pullCampaign('c1');
    expect(useCloudView.getState().phase).toBe('synced');
    expect((await local.read('c1'))!.day).toBe(10);
  });

  it('pushes automatically only when switched on, set up, and ahead', async () => {
    await local.write(base('c1'), 'c1', 'x');
    vi.useFakeTimers();
    noteLocalSave('c1', 0);
    vi.advanceTimersByTime(10);
    vi.useRealTimers();
    await new Promise(r => setTimeout(r, 30));
    expect(cloud.calls).toEqual([]);
    resetAutoSync();
    setAutoSync(true);
    noteLocalSave('c1', 0);
    for (let i = 0; i < 100 && !cloud.calls.includes('put'); i++) await new Promise(r => setTimeout(r, 10));
    expect(cloud.calls).toContain('put');
    expect((await cloud.list())[0].campaignId).toBe('c1');
    expect(await pushIfAhead('c1')).toBe(false);
    local.play('c1', 3);
    expect(await pushIfAhead('c1')).toBe(true);
    const other = device(cloud, 'dev-b');
    await other.svc.pull('c1'); other.local.play('c1', 1); await other.svc.push('c1');
    local.play('c1', 1);
    expect(await pushIfAhead('c1')).toBe(false);
    expect((await cloud.get('c1'))!.deviceId).toBe('dev-b');
  });

  it('does not upload on a timer faster than the gap', async () => {
    setAutoSync(true);
    await local.write(base('c1'), 'c1', 'x');
    resetAutoSync();
    let t = 1_000_000;
    noteLocalSave('c1', 60_000, () => t);
    for (let i = 0; i < 100 && !cloud.calls.includes('put'); i++) await new Promise(r => setTimeout(r, 10));
    expect(cloud.calls.filter(c => c === 'put').length).toBe(1);
    local.play('c1', 1);
    t += 5_000;
    noteLocalSave('c1', 60_000, () => t);
    await new Promise(r => setTimeout(r, 50));
    expect(cloud.calls.filter(c => c === 'put').length).toBe(1);
  });
});

describe('9.9 local saves in IndexedDB', () => {
  beforeEach(async () => { await db.saves.clear(); clearStorage(); });
  afterEach(async () => { await db.saves.clear(); clearStorage(); });

  it('groups saves by campaign and offers the newest of each', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    await saveGame(base('c1', 10), 'manual', 'Manual', 'guest');
    vi.spyOn(Date, 'now').mockReturnValue(2000);
    await saveGame(base('c1', 14), autosaveId('c1'), 'Auto', 'guest');
    vi.spyOn(Date, 'now').mockReturnValue(1500);
    await saveGame(base('c2', 3), autosaveId('c2'), 'Other', 'guest');
    const local = new DexieLocalSaves();
    const list = await local.campaigns();
    expect(list.map(c => c.campaignId).sort()).toEqual(['c1', 'c2']);
    const c1 = list.find(c => c.campaignId === 'c1')!;
    expect(c1.updatedAt).toBe(2000);
    expect(c1.summary.day).toBe(14);
    expect(c1.baseRevision).toBe(0);
    expect((await local.read('c1'))!.day).toBe(14);
    expect(await local.read('nope')).toBeNull();
    vi.restoreAllMocks();
  });

  it('writes a pulled campaign as its newest autosave and reads its lineage back', async () => {
    const local = new DexieLocalSaves();
    const at = await local.write(withLineage(base('c1', 20), { baseRevision: 3, deviceId: 'dev-a', syncedDay: 20 }), 'c1', 'Cloud');
    expect(at).toBeGreaterThan(0);
    const [c] = await local.campaigns();
    expect(c).toMatchObject({ campaignId: 'c1', baseRevision: 3, updatedAt: at });
    expect((await db.saves.get(autosaveId('c1')))!.name).toBe('Cloud');
  });

  it('ignores saves that carry no campaign id', async () => {
    const legacy = base('c1'); delete (legacy.world as { campaignId?: string }).campaignId;
    await db.saves.put({ id: 'old', owner: 'guest', name: 'old', updatedAt: 5, schemaVersion: legacy.schemaVersion, state: legacy });
    expect(await new DexieLocalSaves().campaigns()).toEqual([]);
  });

  it('keeps this device’s record of the last sync under the current owner', () => {
    const meta = new LocalStorageMeta('guest'), other = new LocalStorageMeta('bob');
    expect(meta.read()).toEqual({});
    meta.write('c1', { revision: 2, localUpdatedAt: 5, checksum: 'x', syncedAt: 9 });
    expect(meta.read().c1.revision).toBe(2);
    expect(other.read()).toEqual({});
    localStorage.setItem('ron-cloud-meta-v1:guest', JSON.stringify({ c1: { revision: 'two' }, c2: { revision: 1, localUpdatedAt: 1, checksum: 'y', syncedAt: 1 } }));
    expect(Object.keys(meta.read())).toEqual(['c2']);
    meta.write('c2', null);
    expect(meta.read()).toEqual({});
    localStorage.setItem('ron-cloud-meta-v1:guest', 'not json');
    expect(meta.read()).toEqual({});
  });
});
