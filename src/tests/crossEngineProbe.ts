import {makeInitialState} from '../data/initialState';
import * as det from '../engine/detMath';
import {snapshotGame} from '../persistence/snapshot';
import {bitsOf, powInputs, unaryInputs, UNARY_NAMES} from './detMathCorpus';
import {runDays} from './headlessRun';

/**
 * Hashes that must be identical in every JavaScript engine. Imported by the Node side and by the browser page of
 * e2e/crossEngineDeterminism.spec.ts, so Chromium (V8) and WebKit (JavaScriptCore) are compared with Node (V8).
 */
const stable = (v: unknown): string => {
  if (Array.isArray(v)) return '[' + v.map(x => (x === undefined ? 'null' : stable(x))).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).sort().filter(k => o[k] !== undefined).map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
  }
  if (typeof v === 'number') return Object.is(v, -0) ? '"-0"' : Number.isFinite(v) ? String(v) : `"${v}"`;
  return JSON.stringify(v);
};

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 of the key-sorted snapshot after `days` headless days from the default campaign. */
export async function probeHash(days: number): Promise<string> {
  return sha256Hex(stable(snapshotGame(runDays(makeInitialState(), days))));
}

/** SHA-256 of the exact bit patterns detMath returns over the shared corpora. */
export async function detMathCorpusHash(): Promise<string> {
  const lines: string[] = [];
  for (const name of UNARY_NAMES) lines.push(name + ':' + unaryInputs(name).map(x => bitsOf(det[name](x))).join(','));
  lines.push('pow:' + powInputs().map(([x, y]) => bitsOf(det.pow(x, y))).join(','));
  return sha256Hex(lines.join('\n'));
}
