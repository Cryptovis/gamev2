// 0.88 track E (audit E2): optional faction state on politics. Absent in older saves (created on the first tick).
// Plain checks (no zod) so the rule is exercised even where zod is stubbed.
import { FACTION_KEYS } from '../domain/politics';

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const percent = (v: unknown) => isFiniteNumber(v) && v >= 0 && v <= 100;
const optionalDay = (v: unknown) => v === undefined || (isFiniteNumber(v) && Number.isInteger(v));
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function validFactionRecord(value: unknown): boolean {
  return isRecord(value) && FACTION_KEYS.every((k) => percent(value[k]));
}

/** Validates `politics.factions` when present; a save without it is valid. */
export function validFactionState(value: unknown, day: number): boolean {
  if (value === undefined) return true;
  if (!isRecord(value)) return false;
  if (!validFactionRecord(value.strength) || !validFactionRecord(value.satisfaction) || !percent(value.pressure)) return false;
  if (!isFiniteNumber(value.terms) || value.terms < 0 || !Number.isInteger(value.terms)) return false;
  if (!optionalDay(value.honeymoonUntil) || !optionalDay(value.lastCrisisDay) || !optionalDay(value.lastResponseDay)) return false;
  if (value.responseStreak !== undefined && (!isFiniteNumber(value.responseStreak) || value.responseStreak < 0)) return false;
  const concession = value.concession;
  if (concession !== undefined && (!isRecord(concession) || !FACTION_KEYS.includes(concession.faction as never) || !optionalDay(concession.untilDay) || concession.untilDay === undefined)) return false;
  const election = value.lastElection;
  if (election !== undefined && (!isRecord(election) || !optionalDay(election.day) || (election.day as number) > day || !percent(election.governmentShare) || typeof election.won !== 'boolean')) return false;
  const crisis = value.crisis;
  if (crisis !== undefined) {
    if (!isRecord(crisis) || !isFiniteNumber(crisis.openedDay) || !isFiniteNumber(crisis.deadlineDay) || crisis.openedDay > day || crisis.deadlineDay < crisis.openedDay) return false;
    if (crisis.response !== undefined && !['concede', 'crackdown', 'reform'].includes(crisis.response as string)) return false;
    if (crisis.acknowledged !== undefined && typeof crisis.acknowledged !== 'boolean') return false;
  }
  return true;
}

/** Every country's optional faction state is well formed. */
export function validFactionsInSave(save: { day: number; countries: Record<string, unknown> }): boolean {
  return Object.values(save.countries).every((c) => {
    const politics = isRecord(c) ? c.politics : undefined;
    return !isRecord(politics) || validFactionState(politics.factions, save.day);
  });
}
