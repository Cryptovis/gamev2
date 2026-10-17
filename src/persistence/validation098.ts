import { CHAMBER_SEATS, STRIKE_LEVELS } from '../domain/parliament';
import { FACTION_KEYS } from '../domain/politics';

/**
 * Phase 9.8 parliament state (world.parliament, optional). Saves without it are valid; a present state must belong to
 * known countries, keep every chamber at exactly 200 seats, reference only known blocs and levels, and keep every
 * meter and counter bounded.
 */
export function validParliamentState(value: unknown): boolean {
  const s = value as { day: number; countries: Record<string, unknown>; world?: { parliament?: unknown } };
  const parliament = s?.world?.parliament as Record<string, unknown> | undefined;
  if (parliament === undefined) return true;
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(parliament) || !obj(parliament.countries)) return false;
  const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const int = (v: unknown, lo: number, hi: number): v is number => num(v, lo, hi) && Number.isInteger(v);
  const day = (v: unknown): v is number => int(v, 0, 1_000_000);
  const blocs = (v: unknown): v is string[] => Array.isArray(v) && v.length <= FACTION_KEYS.length && new Set(v).size === v.length && v.every(k => FACTION_KEYS.includes(k as never));
  const perBloc = (v: unknown, test: (n: unknown) => boolean): v is Record<string, unknown> => obj(v) && FACTION_KEYS.every(k => test(v[k]));
  if (Object.keys(parliament.countries).length > 400) return false;

  for (const [id, raw] of Object.entries(parliament.countries)) {
    if (!s.countries?.[id] || !obj(raw)) return false;
    if (!perBloc(raw.seats, n => int(n, 0, CHAMBER_SEATS))) return false;
    if (FACTION_KEYS.reduce((sum, k) => sum + (raw.seats as Record<string, number>)[k], 0) !== CHAMBER_SEATS) return false;
    if (!perBloc(raw.unhappyDays, n => int(n, 0, 1_000_000))) return false;
    if (!blocs(raw.coalition) || raw.coalition.length < 1) return false;
    if (!obj(raw.support) || !Object.entries(raw.support).every(([k, d]) => FACTION_KEYS.includes(k as never) && day(d))) return false;
    if (!day(raw.seatedDay) || !day(raw.cabinetFormedDay) || !int(raw.minorityDays, 0, 1_000_000) || !num(raw.unrest, 0, 100)) return false;
    if (raw.cabinet !== 'governing' && raw.cabinet !== 'caretaker') return false;
    if (raw.motion !== undefined && !(obj(raw.motion) && day(raw.motion.openedDay) && day(raw.motion.voteDay) && raw.motion.voteDay >= raw.motion.openedDay)) return false;
    if (raw.motionCooldownUntil !== undefined && !day(raw.motionCooldownUntil)) return false;
    if (raw.lastVote !== undefined && !(obj(raw.lastVote) && day(raw.lastVote.day) && int(raw.lastVote.ayes, 0, CHAMBER_SEATS) && int(raw.lastVote.noes, 0, CHAMBER_SEATS) && typeof raw.lastVote.survived === 'boolean')) return false;
    const strike = raw.strike;
    if (!obj(strike) || !STRIKE_LEVELS.includes(strike.level as never) || !int(strike.levelDays, 0, 1_000_000) || !num(strike.disorder, 0, 100)) return false;
    for (const key of ['startedDay', 'agreementUntil', 'subsidyUntil', 'hoursUntil', 'lastTalksDay', 'lastRiotDay'] as const) if (strike[key] !== undefined && !day(strike[key])) return false;
    if (strike.talksStreak !== undefined && !int(strike.talksStreak, 0, 1000)) return false;
    if (!Array.isArray(raw.history) || raw.history.length > 50 || !raw.history.every(h => obj(h) && day(h.day) && typeof h.kind === 'string' && (h.detail === undefined || typeof h.detail === 'string'))) return false;
  }
  return true;
}
