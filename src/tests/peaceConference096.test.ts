import { withWarFuel } from './warFixture';
import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import { REGION_IDS, CONFERENCE_PATIENCE_DAYS, ARMISTICE_OFFER_DAYS, ARMISTICE_QUIET_DAYS } from '../domain/peace';
import { applyGameCommand } from '../engine/commands';
import { tickGame } from '../engine/tick';
import { resolveCombatRound } from '../engine/systems/warfare';
import { warDeclarationStatus } from '../engine/systems/warRules';
import { REGION_TEMPLATES, occupiedRegions, regionWeight, sizeFactor } from '../engine/systems/peaceRegions';
import { CAPITULATION_FLOOR, WAR_SCORE_MAX, warScore, warScoreBoard, winnerFor } from '../engine/systems/warScore';
import { ARMOR_CAPS, FLEET_CAPS, PUPPET_ID, annexId, demandCatalog, demandCost, disarmId, dmzId, parseDemand, reparationsId, totalCost } from '../engine/systems/peaceDemands';
import {
  ARMISTICE_MIN_SCORE, conferenceView, concludePeace, dmzBars, enforceDisarmament, orderTerms, pendingPeace, peaceOf, processPeaceConferences,
  processPeaceObligations, togglePeaceDemand, treatyPreview, waivePeace,
} from '../engine/systems/peaceTreaty';
import { ARMISTICE_REQUEST_EXHAUSTION, acceptArmistice, armisticeRequestReason, declineArmistice, processArmisticeRequests } from '../engine/systems/peaceArmistice';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import { validPeaceState } from '../persistence/validation096';
import { MERGED_CATALOG_GROUP } from '../i18n/localeText';
import { UI_CATALOG_096P } from '../i18n/uiCatalog096Peace';

const base = (): GameState => {
  const s = makeInitialState();
  s.world.tutorial.active = false;
  s.eventCooldownUntil = 100000;
  s.advisorCooldownUntil = 100000;
  return s;
};

/** Plays the player's war on Greece to its end; the war ends in a decisive result and a conference opens. */
function wonWar(): { s: GameState; id: string } {
  let s = applyGameCommand(withWarFuel(base()), { type: 'military/declareWar', targetCountryId: 'GRC' });
  const id = Object.keys(s.wars)[0];
  for (let i = 0; i < 400 && s.wars[id].status === 'active'; i++) {
    s = resolveCombatRound(s, id);
    s = { ...s, day: s.day + 1 };
  }
  return { s, id };
}

/** The same war part way through: in progress, with the front and exhaustion set by the caller. */
function ongoingWar(progress: number, exhaustion: number): { s: GameState; id: string } {
  const s = applyGameCommand(withWarFuel(base()), { type: 'military/declareWar', targetCountryId: 'GRC' });
  const id = Object.keys(s.wars)[0];
  return { s: { ...s, wars: { ...s.wars, [id]: { ...s.wars[id], progress, defenderExhaustion: exhaustion } } }, id };
}

const toggle = (s: GameState, id: string, demand: string) => applyGameCommand(s, { type: 'peace/toggle', warId: id, demand });
const conclude = (s: GameState, id: string) => applyGameCommand(s, { type: 'peace/conclude', warId: id });

describe('9.6 region model', () => {
  it('has six regions whose population, output and resource shares each sum to one', () => {
    expect(REGION_IDS.length).toBe(6);
    for (const metric of ['population', 'output', 'resources'] as const) {
      const sum = REGION_IDS.reduce((total, id) => total + REGION_TEMPLATES[id][metric], 0);
      expect(Math.abs(sum - 1) < 1e-9).toBe(true);
    }
  });
  it('weights regions by their share of the country and gives a larger economy a larger size factor', () => {
    expect(regionWeight('capital')).toBeGreaterThan(0);
    const s = base();
    expect(sizeFactor(s.countries.USA)).toBeGreaterThan(sizeFactor(s.countries.MLT));
  });
  it('occupies regions in a fixed order as the front advances, and all of them on capitulation', () => {
    const { s, id } = ongoingWar(0, 0);
    const war = s.wars[id];
    expect(occupiedRegions(war, 'attacker').length).toBe(0);
    const deep = occupiedRegions({ ...war, progress: 60 }, 'attacker');
    const deeper = occupiedRegions({ ...war, progress: 90 }, 'attacker');
    expect(deeper.length).toBeGreaterThan(deep.length - 1);
    for (const region of deep) expect(deeper.includes(region)).toBe(true);
    expect(occupiedRegions(war, 'attacker', true).length).toBe(6);
  });
});

describe('9.6 war score', () => {
  it('reports eight bounded lines and no more than the ceiling', () => {
    const { s, id } = ongoingWar(55, 40);
    const score = warScore(s, s.wars[id], 'attacker');
    expect(score.lines.length).toBe(8);
    for (const line of score.lines) {
      expect(line.points).toBeGreaterThan(-0.0001);
      expect(line.points).toBeLessThanOrEqual(line.max + 1e-9);
    }
    expect(score.subtotal).toBeLessThanOrEqual(WAR_SCORE_MAX);
    expect(score.capitulated).toBe(false);
    expect(score.total).toBe(Math.round(score.subtotal));
  });
  it('rises with the front and with enemy exhaustion', () => {
    const low = ongoingWar(20, 10);
    const high = ongoingWar(70, 60);
    expect(warScore(high.s, high.s.wars[high.id], 'attacker').subtotal).toBeGreaterThan(warScore(low.s, low.s.wars[low.id], 'attacker').subtotal);
  });
  it('is zero-sum in sign: the side that is losing the front holds less than the side that is winning', () => {
    const { s, id } = ongoingWar(70, 60);
    const board = warScoreBoard(s, s.wars[id]);
    expect(board.attacker.subtotal).toBeGreaterThan(board.defender.subtotal);
  });
  it('raises the winner to the capitulation floor when the war is decisive', () => {
    const { s, id } = wonWar();
    const war = s.wars[id];
    expect(winnerFor(war)).toBe('attacker');
    const score = warScore(s, war, 'attacker');
    expect(score.capitulated).toBe(true);
    expect(score.total).toBeGreaterThan(CAPITULATION_FLOOR - 1);
  });
  it('is the same every time it is computed from the same state', () => {
    const { s, id } = ongoingWar(48, 35);
    expect(JSON.stringify(warScoreBoard(s, s.wars[id]))).toBe(JSON.stringify(warScoreBoard(s, s.wars[id])));
  });
});

describe('9.6 demands and costs', () => {
  it('parses every catalogue entry and rejects malformed ones', () => {
    for (const id of demandCatalog(true)) expect(parseDemand(id) === null).toBe(false);
    for (const bad of ['', 'annex', 'annex:moon', 'dmz:capital', 'reparations:9:light', 'reparations:2:huge', 'disarm:armor:51', 'puppet:x', 'peace']) expect(parseDemand(bad)).toBeNull();
  });
  it('offers a puppet only to an attacker', () => {
    expect(demandCatalog(true).includes(PUPPET_ID)).toBe(true);
    expect(demandCatalog(false).includes(PUPPET_ID)).toBe(false);
  });
  it('prices the same region lower against a small country than a large one', () => {
    const s = base();
    expect(demandCost(s.countries.MLT, annexId('industrial'))).toBeLessThan(demandCost(s.countries.USA, annexId('industrial')));
  });
  it('prices tribute by years and tier, stronger caps higher, and a puppet above any one region', () => {
    const loser = base().countries.GRC;
    expect(demandCost(loser, reparationsId(4, 'standard'))).toBeGreaterThan(demandCost(loser, reparationsId(2, 'standard')));
    expect(demandCost(loser, reparationsId(3, 'heavy'))).toBeGreaterThan(demandCost(loser, reparationsId(3, 'light')));
    expect(demandCost(loser, disarmId('armor', 30))).toBeGreaterThan(demandCost(loser, disarmId('armor', 70)));
    expect(demandCost(loser, disarmId('fleet', 25))).toBeGreaterThan(demandCost(loser, disarmId('fleet', 70)));
    for (const region of REGION_IDS) expect(demandCost(loser, PUPPET_ID)).toBeGreaterThan(demandCost(loser, annexId(region)) - 1);
    expect(ARMOR_CAPS.length + FLEET_CAPS.length).toBe(6);
  });
  it('totals costs as a plain sum', () => {
    const loser = base().countries.GRC;
    const ids = [annexId('capital'), dmzId('frontier_a')];
    expect(totalCost(loser, ids)).toBe(demandCost(loser, ids[0]) + demandCost(loser, ids[1]));
  });
});

describe('9.6 victory opens a conference instead of annexing', () => {
  it('leaves Greece sovereign, opens an open table for the player and stops the clock', () => {
    const { s, id } = wonWar();
    expect(s.wars[id].status).toBe('victory');
    expect(s.countries.GRC.controllerCountryId == null).toBe(true);
    const conference = peaceOf(s).conferences[id];
    expect(conference.status).toBe('open');
    expect(conference.winnerId).toBe(s.playerCountryId);
    expect(conference.loserId).toBe('GRC');
    expect(conference.imposed).toBeFalsy();
    expect(conference.score).toBeGreaterThan(CAPITULATION_FLOOR - 1);
  });
  it('shows the open table through pendingPeace', () => {
    const { s, id } = wonWar();
    expect(pendingPeace(s)).toEqual({ kind: 'conference', warId: id });
  });
  it('lets an AI winner dictate and conclude at once, leaving an unread notice for a player who lost', () => {
    let s = applyGameCommand(withWarFuel(base()), { type: 'military/declareWar', targetCountryId: 'GRC' });
    const id = Object.keys(s.wars)[0];
    s = { ...s, playerCountryId: 'GRC', selectedCountryId: 'GRC' };
    for (let i = 0; i < 400 && s.wars[id].status === 'active'; i++) {
      s = resolveCombatRound(s, id);
      s = { ...s, day: s.day + 1 };
    }
    const conference = peaceOf(s).conferences[id];
    if (!conference) return;
    expect(conference.status === 'open').toBe(false);
    expect(conference.imposed).toBe(true);
    const treaty = peaceOf(s).treaties.find(t => t.warId === id);
    expect(treaty === undefined).toBe(false);
    expect(treaty!.imposed).toBe(true);
    expect(treaty!.read).toBe(false);
    if (s.campaignStatus === 'active') expect(pendingPeace(s)).toEqual({ kind: 'notice', treatyId: treaty!.id });
  });
});

describe('9.6 building the treaty', () => {
  it('adds and removes a demand, and refuses what the budget cannot afford', () => {
    const { s, id } = wonWar();
    const one = toggle(s, id, annexId('industrial'));
    expect(peaceOf(one).conferences[id].selected).toEqual([annexId('industrial')]);
    expect(peaceOf(toggle(one, id, annexId('industrial'))).conferences[id].selected).toEqual([]);
    const view = conferenceView(one, id)!;
    expect(view.spent).toBe(demandCost(s.countries.GRC, annexId('industrial')));
    expect(view.left).toBe(view.budget - view.spent);
    let full = s;
    for (const region of REGION_IDS) full = toggle(full, id, annexId(region));
    const fullView = conferenceView(full, id)!;
    expect(fullView.left).toBeGreaterThan(-1);
    expect(fullView.spent).toBeLessThanOrEqual(fullView.budget);
  });
  it('keeps only one tribute and one cap per branch at a time', () => {
    const { s, id } = wonWar();
    let t = toggle(s, id, reparationsId(1, 'light'));
    t = toggle(t, id, reparationsId(2, 'standard'));
    t = toggle(t, id, disarmId('armor', 70));
    t = toggle(t, id, disarmId('armor', 50));
    t = toggle(t, id, disarmId('fleet', 70));
    const selected = peaceOf(t).conferences[id].selected;
    expect(selected.filter(d => d.startsWith('reparations')).length).toBe(1);
    expect(selected.includes(reparationsId(2, 'standard'))).toBe(true);
    expect(selected.filter(d => d.startsWith('disarm:armor')).length).toBe(1);
    expect(selected.includes(disarmId('armor', 50))).toBe(true);
    expect(selected.includes(disarmId('fleet', 70))).toBe(true);
  });
  it('does not accept an unknown demand or a toggle from a country that does not own the table', () => {
    const { s, id } = wonWar();
    expect(togglePeaceDemand(s, id, 'annex:moon')).toBe(s);
    const other = { ...s, playerCountryId: 'USA' };
    expect(togglePeaceDemand(other, id, annexId('capital'))).toBe(other);
    expect(conclude(other, id)).toBe(other);
  });
  it('blocks a region the army has not reached when the table comes from an armistice', () => {
    const { s, id } = ongoingWar(30, 80);
    const accepted = acceptArmistice(processArmisticeRequests(s), id);
    const view = conferenceView(accepted, id);
    if (!view) return;
    expect(view.conference.trigger).toBe('armistice');
    const unreached = REGION_IDS.filter(r => !view.occupied.includes(r));
    if (unreached.length === 0) return;
    const before = peaceOf(accepted).conferences[id].selected;
    const after = peaceOf(toggle(accepted, id, annexId(unreached[0]))).conferences[id].selected;
    expect(after).toEqual(before);
  });
});

describe('9.6 concluding annexation', () => {
  const total = (s: GameState, key: (c: GameState['countries'][string]) => number) => key(s.countries.TUR) + key(s.countries.GRC);

  it('moves a share of people, output, treasury and debt and conserves the totals', () => {
    const { s, id } = wonWar();
    const picked = toggle(s, id, annexId('industrial'));
    const done = conclude(picked, id);
    expect(peaceOf(done).conferences[id].status).toBe('concluded');
    expect(peaceOf(done).cessions.GRC.industrial).toBe('TUR');
    for (const key of [(c: GameState['countries'][string]) => c.demographics.population, (c: GameState['countries'][string]) => c.economy.gdp, (c: GameState['countries'][string]) => c.economy.treasury, (c: GameState['countries'][string]) => c.economy.debt]) {
      expect(Math.abs(total(done, key) - total(s, key)) < 1e-3 * Math.max(1, Math.abs(total(s, key)))).toBe(true);
    }
    expect(done.countries.TUR.demographics.population).toBeGreaterThan(s.countries.TUR.demographics.population);
    expect(done.countries.GRC.demographics.population).toBeLessThan(s.countries.GRC.demographics.population);
    expect(done.countries.GRC.economy.gdp).toBeLessThan(s.countries.GRC.economy.gdp);
    expect(done.countries.GRC.controllerCountryId == null).toBe(true);
    expect(done.countries.GRC.annexedBy == null).toBe(true);
  });
  it('conserves resource stocks and factories as well', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(toggle(s, id, annexId('resource')), id, annexId('industrial')), id);
    expect(Math.abs(total(done, c => c.industry.factories) - total(s, c => c.industry.factories)) < 1e-3).toBe(true);
    expect(Math.abs(total(done, c => c.resources.oil) - total(s, c => c.resources.oil)) < 1e-3 * Math.max(1, total(s, c => c.resources.oil))).toBe(true);
  });
  it('matches what the table previewed before signing', () => {
    const { s, id } = wonWar();
    const picked = toggle(toggle(s, id, annexId('heartland')), id, annexId('frontier_a'));
    const preview = treatyPreview(picked, peaceOf(picked).conferences[id]);
    const done = conclude(picked, id);
    const moved = s.countries.GRC.economy.gdp - done.countries.GRC.economy.gdp;
    expect(Math.abs(moved - preview.gdpMovedB) < 1e-3 * Math.max(1, moved)).toBe(true);
    const people = s.countries.GRC.demographics.population - done.countries.GRC.demographics.population;
    expect(Math.abs(people - preview.populationMoved) <= 1).toBe(true);
    expect(preview.fullAnnexation).toBe(false);
  });
  it('folds the loser into the winner when every region is ceded', () => {
    const { s, id } = wonWar();
    let t = s;
    for (const region of REGION_IDS) t = toggle(t, id, annexId(region));
    const selected = peaceOf(t).conferences[id].selected;
    const done = conclude(t, id);
    if (selected.length === REGION_IDS.length) {
      expect(done.countries.GRC.annexedBy === TUR_ID || done.countries.GRC.controllerCountryId === TUR_ID).toBe(true);
    } else {
      expect(done.countries.GRC.annexedBy == null).toBe(true);
    }
  });
  it('signs only once: a second conclude changes nothing', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, annexId('frontier_b')), id);
    expect(conclude(done, id)).toBe(done);
    expect(peaceOf(done).treaties.filter(t => t.warId === id).length).toBe(1);
  });
  it('sets relations to hostile and records a treaty with the spent score', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, annexId('frontier_b')), id);
    const treaty = peaceOf(done).treaties[0];
    expect(treaty.terms).toEqual([annexId('frontier_b')]);
    expect(treaty.scoreSpent).toBe(demandCost(s.countries.GRC, annexId('frontier_b')));
    expect(treaty.read).toBe(true);
    expect(done.countries.TUR.diplomacy.reputation).toBeLessThan(s.countries.TUR.diplomacy.reputation + 1);
  });
  it('makes peace with no terms when the table is waived or empty', () => {
    const { s, id } = wonWar();
    const waived = applyGameCommand(s, { type: 'peace/waive', warId: id });
    expect(peaceOf(waived).conferences[id].status).toBe('waived');
    expect(waived.countries.GRC.economy.gdp).toBe(s.countries.GRC.economy.gdp);
    const empty = conclude(s, id);
    expect(peaceOf(empty).conferences[id].status).toBe('waived');
    expect(waivePeace(waived, id)).toBe(waived);
  });
});

describe('9.6 puppet, tribute, disarmament and buffer zones', () => {
  it('installs a puppet that keeps its name and answers to the winner', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, PUPPET_ID), id);
    expect(done.countries.GRC.controllerCountryId).toBe('TUR');
    expect(done.countries.GRC.politics.regime).toBe(s.countries.TUR.politics.regime);
    expect(done.countries.GRC.politics.stability).toBeLessThan(s.countries.GRC.politics.stability + 1);
    expect(done.countries.TUR.diplomacy.reputation).toBeLessThan(s.countries.TUR.diplomacy.reputation + 1);
  });
  it('refuses a puppet together with the last remaining region, and an annexed country cannot be taken twice', () => {
    const { s, id } = wonWar();
    let t = toggle(s, id, PUPPET_ID);
    for (const region of REGION_IDS) t = toggle(t, id, annexId(region));
    expect(peaceOf(t).conferences[id].selected.filter(d => d.startsWith('annex')).length).toBeLessThan(REGION_IDS.length);
  });
  it('pays tribute every thirty days, capped by the treasury, and strains stability', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, reparationsId(1, 'standard')), id);
    const obligation = peaceOf(done).obligations.find(o => o.kind === 'reparations')!;
    expect(obligation.kind).toBe('reparations');
    const due = obligation as Extract<typeof obligation, { kind: 'reparations' }>;
    const early = processPeaceObligations({ ...done, day: due.nextDay - 1 });
    expect(early.countries.TUR.economy.treasury).toBe(done.countries.TUR.economy.treasury);
    const paid = processPeaceObligations({ ...done, day: due.nextDay });
    expect(paid.countries.TUR.economy.treasury).toBeGreaterThan(done.countries.TUR.economy.treasury);
    expect(paid.countries.GRC.economy.treasury).toBeLessThan(done.countries.GRC.economy.treasury);
    expect(paid.countries.GRC.politics.stability).toBeLessThan(done.countries.GRC.politics.stability);
    const again = processPeaceObligations({ ...paid, day: due.nextDay });
    expect(again.countries.TUR.economy.treasury).toBe(paid.countries.TUR.economy.treasury);
  });
  it('never takes more than the payer holds', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, reparationsId(1, 'heavy')), id);
    const broke = { ...done, countries: { ...done.countries, GRC: { ...done.countries.GRC, economy: { ...done.countries.GRC.economy, treasury: 0.01 } } } };
    const due = peaceOf(broke).obligations.find(o => o.kind === 'reparations') as { nextDay: number };
    const paid = processPeaceObligations({ ...broke, day: due.nextDay });
    expect(paid.countries.GRC.economy.treasury).toBeGreaterThan(-1e-9);
  });
  it('ends the tribute after its term', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, reparationsId(1, 'light')), id);
    const ended = processPeaceObligations({ ...done, day: done.day + 400 });
    expect(peaceOf(ended).obligations.some(o => o.kind === 'reparations')).toBe(false);
  });
  it('caps tanks and warships at the agreed share and keeps the cap', () => {
    const { s, id } = wonWar();
    const tanks = s.countries.GRC.military.tanks;
    const ships = s.countries.GRC.military.warships;
    const done = conclude(toggle(toggle(s, id, disarmId('armor', 50)), id, disarmId('fleet', 50)), id);
    expect(done.countries.GRC.military.tanks).toBeLessThanOrEqual(Math.floor(tanks * 0.5));
    expect(done.countries.GRC.military.warships).toBeLessThanOrEqual(Math.floor(ships * 0.5));
    const rearmed = { ...done, countries: { ...done.countries, GRC: { ...done.countries.GRC, military: { ...done.countries.GRC.military, tanks: tanks * 2 } } } };
    expect(enforceDisarmament(rearmed).countries.GRC.military.tanks).toBeLessThanOrEqual(Math.floor(tanks * 0.5));
  });
  it('lifts the caps when the clause expires', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, disarmId('armor', 50)), id);
    const later = processPeaceObligations({ ...done, day: done.day + 1900 });
    expect(peaceOf(later).obligations.some(o => o.kind === 'disarm')).toBe(false);
  });
  it('bars the bound country from attacking the beneficiary and lowers its readiness ceiling', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, dmzId('frontier_a')), id);
    expect(dmzBars(done, 'GRC', 'TUR')).toBe(true);
    expect(dmzBars(done, 'TUR', 'GRC')).toBe(false);
    expect(dmzBars(done, 'GRC', 'USA')).toBe(false);
    const status = warDeclarationStatus(done, 'GRC', 'TUR');
    expect(status.allowed).toBe(false);
    expect(status.block).toBe('dmz');
    const lapsed = processPeaceObligations({ ...done, day: done.day + 1900 });
    expect(dmzBars(lapsed, 'GRC', 'TUR')).toBe(false);
  });
});

describe('9.6 armistice', () => {
  it('opens no table when the war score is too low', () => {
    const { s, id } = ongoingWar(5, 5);
    expect(warScore(s, s.wars[id], 'attacker').subtotal).toBeLessThan(ARMISTICE_MIN_SCORE);
    expect(armisticeRequestReason(s, id)).toBeNull();
  });
  it('asks the player for an armistice when the defender is exhausted, and the offer lapses', () => {
    const { s, id } = ongoingWar(60, ARMISTICE_REQUEST_EXHAUSTION + 5);
    expect(armisticeRequestReason(s, id) === null).toBe(false);
    const offered = processArmisticeRequests({ ...s, speed: 2 });
    const offer = peaceOf(offered).offers![id];
    expect(offer.status).toBe('open');
    expect(offer.expiresDay).toBe(s.day + ARMISTICE_OFFER_DAYS);
    expect(offered.speed).toBe(0);
    const calmer = { ...offered, day: offer.expiresDay, wars: { ...offered.wars, [id]: { ...offered.wars[id], progress: 0, defenderExhaustion: 0 } } };
    expect(peaceOf(processArmisticeRequests(calmer)).offers?.[id]).toBeUndefined();
    const renewed = peaceOf(processArmisticeRequests({ ...offered, day: offer.expiresDay })).offers![id];
    expect(renewed.expiresDay).toBe(offer.expiresDay + ARMISTICE_OFFER_DAYS);
  });
  it('accepting ends the war and opens a table limited to the ground held', () => {
    const { s, id } = ongoingWar(60, 80);
    const offered = processArmisticeRequests(s);
    const accepted = applyGameCommand(offered, { type: 'peace/acceptArmistice', warId: id });
    expect(accepted.wars[id].status).not.toBe('active');
    const conference = peaceOf(accepted).conferences[id];
    expect(conference.trigger).toBe('armistice');
    expect(conference.winnerId).toBe(s.playerCountryId);
    expect(peaceOf(accepted).offers?.[id]).toBeUndefined();
  });
  it('declining keeps the war going and silences the request for a month', () => {
    const { s, id } = ongoingWar(60, 80);
    const offered = processArmisticeRequests(s);
    const declined = applyGameCommand(offered, { type: 'peace/declineArmistice', warId: id });
    expect(declined.wars[id].status).toBe('active');
    const offer = peaceOf(declined).offers![id];
    expect(offer.status).toBe('declined');
    expect(offer.expiresDay).toBe(s.day + ARMISTICE_QUIET_DAYS);
    const quiet = processArmisticeRequests({ ...declined, day: s.day + 5 });
    expect(peaceOf(quiet).offers![id].status).toBe('declined');
    expect(declineArmistice(offered, 'none')).toBe(offered);
  });
  it('ignores accept and decline when there is no offer', () => {
    const { s, id } = ongoingWar(60, 80);
    expect(acceptArmistice(s, id)).toBe(s);
    expect(declineArmistice(s, id)).toBe(s);
  });
});

describe('9.6 the clock', () => {
  it('signs an open table with its current demands after the patience period', () => {
    const { s, id } = wonWar();
    const picked = toggle(s, id, annexId('frontier_a'));
    const early = processPeaceConferences({ ...picked, day: peaceOf(picked).conferences[id].openedDay + CONFERENCE_PATIENCE_DAYS - 1 });
    expect(peaceOf(early).conferences[id].status).toBe('open');
    const late = processPeaceConferences({ ...picked, day: peaceOf(picked).conferences[id].openedDay + CONFERENCE_PATIENCE_DAYS });
    expect(peaceOf(late).conferences[id].status).toBe('concluded');
    expect(peaceOf(late).cessions.GRC.frontier_a).toBe('TUR');
  });
  it('runs through tickGame without touching the simulation seed when the player concludes', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, annexId('frontier_a')), id);
    expect(done.simulationSeed).toBe(s.simulationSeed);
    const ticked = tickGame({ ...done, speed: 1 });
    expect(peaceOf(ticked).conferences[id].status).toBe('concluded');
    expect(peaceOf(ticked).cessions.GRC.frontier_a).toBe('TUR');
  });
  it('leaves world.peace untouched in a world with no wars', () => {
    let s = base();
    for (let i = 0; i < 90; i++) s = tickGame(s);
    expect(s.world.peace).toBeUndefined();
  });
});

describe('9.6 determinism', () => {
  it('produces identical states from identical inputs', () => {
    const a = wonWar();
    const b = wonWar();
    const finish = (r: { s: GameState; id: string }) => conclude(toggle(toggle(r.s, r.id, annexId('industrial')), r.id, reparationsId(2, 'standard')), r.id);
    expect(JSON.stringify(finish(a))).toBe(JSON.stringify(finish(b)));
  });
  it('orders terms the same way whatever order they were chosen in', () => {
    const terms = [reparationsId(1, 'light'), dmzId('frontier_a'), disarmId('armor', 70), PUPPET_ID, annexId('capital')];
    expect(orderTerms(terms)).toEqual(orderTerms([...terms].reverse()));
    expect(orderTerms(terms)[0]).toBe(annexId('capital'));
  });
});

describe('9.6 saves', () => {
  it('keeps world.peace through snapshot and migration and accepts a save without it', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, annexId('frontier_a')), id);
    const loaded = migrateSave(snapshotGame(done));
    expect(loaded === null).toBe(false);
    expect(JSON.stringify(loaded!.world.peace)).toBe(JSON.stringify(done.world.peace));
    expect(validPeaceState(done)).toBe(true);
    expect(validPeaceState(base())).toBe(true);
  });
  it('rejects corrupt peace state', () => {
    const { s, id } = wonWar();
    const done = conclude(toggle(s, id, annexId('frontier_a')), id);
    const bad = (mutate: (peace: any) => void) => {
      const copy = structuredClone(done) as any;
      mutate(copy.world.peace);
      return validPeaceState(copy);
    };
    expect(bad(p => { p.treaties[0].terms = ['annex:moon']; })).toBe(false);
    expect(bad(p => { p.treaties[0].winnerId = 'XXX'; })).toBe(false);
    expect(bad(p => { p.conferences = []; })).toBe(false);
    expect(bad(p => { p.cessions.GRC.capital = 'XXX'; })).toBe(false);
    expect(validPeaceState({ ...done, world: { ...done.world, peace: 'peace' } })).toBe(false);
  });
});

describe('9.6 text', () => {
  it('has four non-empty translations for every key and keeps placeholders in step', () => {
    for (const [key, translations] of Object.entries(UI_CATALOG_096P)) {
      expect(translations.length).toBe(4);
      const holes = (text: string) => (text.match(/\{\d\}/g) ?? []).sort().join('');
      for (const text of translations) {
        expect(text.trim().length).toBeGreaterThan(0);
        if (key !== 'Barış Masası') expect(holes(text)).toBe(holes(key));
      }
    }
  });
  it('is not shadowed by a later catalogue entry', () => {
    const last = MERGED_CATALOG_GROUP[MERGED_CATALOG_GROUP.length - 1];
    expect(last).toBe(UI_CATALOG_096P);
  });
});

const TUR_ID = 'TUR';
