import { isScenarioId } from '../domain/scenario';

/**
 * Phase 10.0 scenario record (world.scenario, optional). A save without it is valid; a present one must name a known
 * scenario and a start day that is not in the save's future.
 */
export function validScenarioState(value: unknown): boolean {
  const s = value as { day?: number; world?: { scenario?: unknown } };
  const scenario = s?.world?.scenario;
  if (scenario === undefined) return true;
  const r = scenario as { id?: unknown; startedDay?: unknown } | null;
  return !!r && typeof r === 'object' && !Array.isArray(r) && isScenarioId(r.id) && typeof r.startedDay === 'number' && Number.isInteger(r.startedDay) && r.startedDay >= 1 && typeof s.day === 'number' && r.startedDay <= s.day;
}
