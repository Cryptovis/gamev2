import { ENRICH_LEVELS } from '../domain/nuclear';

/**
 * Phase 9.7 nuclear state (world.nuclear, optional). Saves without it are valid; a present state must reference known
 * countries, carry only known assays and feeds, and keep every count and day bounded.
 */
export function validNuclearState(value: unknown): boolean {
  const s = value as { day: number; countries: Record<string, unknown>; world?: { nuclear?: unknown } };
  const nuclear = s?.world?.nuclear as Record<string, unknown> | undefined;
  if (nuclear === undefined) return true;
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!obj(nuclear) || !obj(nuclear.programs) || !obj(nuclear.iaea)) return false;
  const known = (id: unknown): id is string => typeof id === 'string' && !!s.countries?.[id];
  const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  const int = (v: unknown, lo: number, hi: number): v is number => num(v, lo, hi) && Number.isInteger(v);
  const day = (v: unknown): v is number => int(v, 0, 1_000_000);
  const past = (v: unknown): v is number => day(v) && v <= s.day;
  const feeds = ['natural', ...ENRICH_LEVELS];
  const kinds = ['centrifuges', 'assembly', 'icbm', 'ssbn', 'bomber'];
  if (Object.keys(nuclear.programs).length > 400 || Object.keys(nuclear.iaea).length > 400) return false;

  for (const [id, raw] of Object.entries(nuclear.programs)) {
    if (!known(id) || !obj(raw)) return false;
    const stock = raw.stock, delivery = raw.delivery, baseline = raw.baseline;
    if (!obj(stock) || !ENRICH_LEVELS.every(l => num(stock[l], 0, 1e9))) return false;
    if (!obj(delivery) || !['icbm', 'ssbn', 'bombers'].every(k => int(delivery[k], 0, 10000))) return false;
    if (!obj(baseline) || !int(baseline.warheads, 0, 100000) || !int(baseline.patrol, 0, 10000) || !obj(baseline.delivery) || !['icbm', 'ssbn', 'bombers'].every(k => int((baseline.delivery as Record<string, unknown>)[k], 0, 10000))) return false;
    if (!int(raw.warheads, 0, 100000) || !int(raw.assembly, 0, 3) || !int(raw.patrol, 0, 10000) || !num(raw.readiness, 0, 100) || !int(raw.serial, 0, 1_000_000)) return false;
    if (raw.lastAssemblyDay !== undefined && !past(raw.lastAssemblyDay)) return false;
    if ((raw.patrol as number) > (delivery.ssbn as number)) return false;
    if (!Array.isArray(raw.sites) || raw.sites.length > 6) return false;
    for (const site of raw.sites) {
      if (!obj(site) || typeof site.id !== 'string' || !['declared', 'clandestine'].includes(site.kind as string)) return false;
      if (!int(site.centrifuges, 0, 100000) || !ENRICH_LEVELS.includes(site.target as never) || !feeds.includes(site.feed as string)) return false;
      if (!past(site.builtDay) || !num(site.concealment, 0, 100) || (site.exposed !== undefined && typeof site.exposed !== 'boolean')) return false;
    }
    if (!Array.isArray(raw.builds) || raw.builds.length > 60) return false;
    for (const b of raw.builds) {
      if (!obj(b) || typeof b.id !== 'string' || !kinds.includes(b.kind as string) || !int(b.qty, 1, 10000) || !past(b.startDay) || !day(b.doneDay) || !num(b.cost, 0, 1e6)) return false;
    }
  }

  const stages = ['exposed', 'board', 'unsc', 'closed'];
  const statuses = ['compliant', 'queried', 'noncompliant', 'referred', 'sanctioned', 'withdrawn'];
  for (const [id, raw] of Object.entries(nuclear.iaea)) {
    if (!known(id) || !obj(raw) || typeof raw.npt !== 'boolean' || typeof raw.additionalProtocol !== 'boolean') return false;
    if (!num(raw.compliance, 0, 100) || !num(raw.suspicion, 0, 100) || !day(raw.nextInspectionDay) || !statuses.includes(raw.status as string)) return false;
    if (raw.lastInspectionDay !== undefined && !past(raw.lastInspectionDay)) return false;
    if (!Array.isArray(raw.findings) || raw.findings.length > 20 || !raw.findings.every(f => obj(f) && past(f.day) && typeof f.kind === 'string')) return false;
    const c = raw.case;
    if (c !== undefined) {
      if (!obj(c) || !stages.includes(c.stage as string) || !['exposure', 'withdrawal'].includes(c.cause as string)) return false;
      if (!past(c.openedDay) || !day(c.boardDay) || !day(c.unscDay)) return false;
      if (c.outcome !== undefined && !['sanctions', 'vetoed', 'failed'].includes(c.outcome as string)) return false;
      if (c.vetoedBy !== undefined && !known(c.vetoedBy)) return false;
    }
  }
  return true;
}
