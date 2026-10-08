import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import { tickGame } from '../engine/tick';
import { resolveEvent } from '../engine/systems/events';
import { simulateResources } from '../engine/systems/resources';
import { dismissVictory, pendingVictory } from '../engine/systems/victory';

// Headless "no player action" year: the player only acknowledges whatever would pause the clock
// (events take their first option; advisor/notice/tutorial pop-ups and victory scrolls are dismissed).
function acknowledge(state: GameState): GameState {
  let s = state;
  if (s.activeEvent) s = resolveEvent(s, s.activeEvent.options[0].id);
  for (let victory = pendingVictory(s); victory; victory = pendingVictory(s)) s = dismissVictory(s, victory.warId);
  const living = s.world.living;
  return {
    ...s,
    activeEvent: null,
    activeAdvisor: null,
    world: { ...s.world, tutorial: { ...s.world.tutorial, active: false }, living: living ? { ...living, advice: { ...living.advice, active: null }, notice: undefined } : living },
  };
}

function nonFinitePaths(value: unknown, path: string, out: string[]) {
  if (out.length >= 10) return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) out.push(`${path}=${value}`); return; }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) nonFinitePaths(child, `${path}.${key}`, out);
}

describe('long-run world invariants (365 days, default campaign, no player policy)', () => {
  it('keeps the world economy finite and solvent without a global oil, food or treasury collapse', () => {
    let s = makeInitialState();
    const tickMs: number[] = [];
    for (let day = 0; day < 365; day++) {
      s = acknowledge(s);
      const started = performance.now();
      s = tickGame(s);
      tickMs.push(performance.now() - started);
      expect(s.day).toBe(day + 2);
      if (day % 73 === 72) {
        const bad: string[] = [];
        nonFinitePaths(s, 'state', bad);
        expect(bad).toEqual([]);
      }
    }
    expect(s.campaignStatus).toBe('active');

    const countries = Object.values(s.countries).filter(c => !c.annexedBy);
    const flows = countries.map(c => ({ c, flow: simulateResources(c) }));
    const oilShort = flows.filter(x => x.flow.oilShortage).length;
    expect(oilShort / countries.length).toBeLessThan(0.25);

    const top10 = [...countries].sort((a, b) => b.demographics.population - a.demographics.population).slice(0, 10);
    expect(top10.filter(c => simulateResources(c).foodShortage).map(c => c.id)).toEqual([]);

    const broke = countries.filter(c => c.economy.treasury < 1).length;
    expect(broke / countries.length).toBeLessThan(0.2);

    for (const c of countries) for (const v of [...Object.values(c.resources), ...Object.values(c.processedResources)]) expect(v).toBeGreaterThanOrEqual(0);

    // Generous bound so slow CI machines do not flake; the 0.84 median is ~20 ms on a laptop-class CPU.
    tickMs.sort((a, b) => a - b);
    expect(tickMs[tickMs.length >> 1]).toBeLessThan(250);
  }, 120_000);
});
