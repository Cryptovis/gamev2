import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import { applyGameCommand } from '../engine/commands';
import { tickGame, tickCountry } from '../engine/tick';
import { NEUTRAL_LEADER } from '../engine/systems/leaderPerks';
import { CHAMBER_SEATS, MAJORITY_SEATS, type CountryParliament } from '../domain/parliament';
import { FACTION_KEYS, type FactionKey } from '../domain/politics';
import { factionsFor } from '../engine/systems/factions';
import {
  BLOC_LABEL, COALITION_CUSHION, PARTNER_PATIENCE_DAYS, allocateSeats, formCoalition, governmentSeats, leadBloc, loyalty, reliableSeats, seatsOf, willingPartner,
} from '../engine/systems/parliamentSeats';
import {
  CALM_RELIEF, STRIKE_EFFECT, STRIKE_START, grievanceDrivers, strikeLevelFor, strikeRisk, talksOptions,
} from '../engine/systems/parliamentStrikes';
import {
  MOTION_DAYS, MOTION_GRACE_DAYS, SNAP_CAMPAIGN_DAYS, TAX_REFORM_STEP, fillReason, mandateFor, parliamentView, processParliament, recordOf,
  strikeLogistics, strikePerks, taxReformBlock,
} from '../engine/systems/parliament';
import { processPoliticalLayer } from '../engine/systems/factions';
import { warDeclarationReason, warDeclarationStatus } from '../engine/systems/warRules';
import { scaledCostB } from '../engine/systems/policyPressure';
import { hemicycleLayout, HEMICYCLE_ORDER, HEMICYCLE_WIDTH, HEMICYCLE_HEIGHT } from '../ui/panels/hemicycle';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
import { validParliamentState } from '../persistence/validation098';
import { MERGED_CATALOG_GROUP } from '../i18n/localeText';
import { UI_CATALOG_098P } from '../i18n/uiCatalog098Parliament';
import { UI_CATALOG_088_E } from '../i18n/uiCatalog088E';

/** A fresh campaign (Turkey, a democracy) whose chamber has met once. */
const base = (): GameState => {
  const s = makeInitialState();
  s.world.tutorial.active = false;
  s.eventCooldownUntil = 100000;
  s.advisorCooldownUntil = 100000;
  return processParliament({ ...s, day: s.day + 1 });
};
/** One parliament day on its own, so the tests do not depend on the rest of the economy. */
const day = (s: GameState) => processParliament({ ...s, day: s.day + 1 });
const days = (s: GameState, n: number) => { let x = s; for (let i = 0; i < n; i++) x = day(x); return x; };
const record = (s: GameState, id = 'TUR') => recordOf(s, id)!;
const withRecord = (s: GameState, id: string, patch: Partial<CountryParliament>): GameState => ({
  ...s, world: { ...s.world, parliament: { countries: { ...s.world.parliament!.countries, [id]: { ...record(s, id), ...patch } } } },
});
const withSatisfaction = (s: GameState, id: string, values: Partial<Record<FactionKey, number>>): GameState => {
  const c = s.countries[id], f = factionsFor(c);
  return { ...s, countries: { ...s.countries, [id]: { ...c, politics: { ...c.politics, factions: { ...f, satisfaction: { ...f.satisfaction, ...values } } } } } };
};
const withCountry = (s: GameState, id: string, patch: (c: GameState['countries'][string]) => GameState['countries'][string]): GameState => ({ ...s, countries: { ...s.countries, [id]: patch(s.countries[id]) } });
/** The cabinet is only the lead bloc and nobody is willing to join it. */
const minority = (s: GameState, id = 'TUR'): GameState => {
  const lead = record(s, id).coalition[0];
  const all = Object.fromEntries(FACTION_KEYS.filter(k => k !== lead).map(k => [k, 36])) as Partial<Record<FactionKey, number>>;
  return withRecord(withSatisfaction(s, id, all), id, { coalition: [lead], support: {} });
};
const strained = (s: GameState, id = 'TUR'): GameState =>
  withCountry(withSatisfaction(s, id, { labour: 10 }), id, c => ({ ...c, economy: { ...c.economy, inflation: 30, treasury: -1 }, politics: { ...c.politics, approval: 20 } }));

describe('9.8 seats and coalitions', () => {
  const strength = { business: 24, labour: 18, security: 17, traditional: 16, liberal: 25 } as Record<FactionKey, number>;
  const content = Object.fromEntries(FACTION_KEYS.map(k => [k, 55])) as Record<FactionKey, number>;
  const factions = (satisfaction = content) => ({ strength, satisfaction, pressure: 0, terms: 0 });
  const country = (approval = 55, stability = 60) => ({ politics: { approval, stability } }) as never;

  it('always seats exactly 200 and never gives a bloc a negative count', () => {
    for (const approval of [0, 20, 50, 80, 100]) for (const stability of [0, 50, 100]) for (const lead of FACTION_KEYS) {
      const seats = allocateSeats(country(approval, stability), factions(), lead);
      expect(FACTION_KEYS.reduce((sum, k) => sum + seats[k], 0)).toBe(CHAMBER_SEATS);
      for (const k of FACTION_KEYS) expect(seats[k] >= 0).toBe(true);
    }
  });
  it('lifts the lead bloc with approval and stability and is deterministic', () => {
    const popular = allocateSeats(country(90, 90), factions(), 'business'), hated = allocateSeats(country(10, 10), factions(), 'business');
    expect(popular.business > hated.business).toBe(true);
    expect(JSON.stringify(allocateSeats(country(), factions(), 'labour'))).toBe(JSON.stringify(allocateSeats(country(), factions(), 'labour')));
  });
  it('gives more seats to a bloc that is content than to the same bloc when it is angry', () => {
    const angry = allocateSeats(country(), factions({ ...content, labour: 5 }), 'liberal');
    const happy = allocateSeats(country(), factions({ ...content, labour: 95 }), 'liberal');
    expect(happy.labour > angry.labour).toBe(true);
  });
  it('picks the lead bloc from the national ideology', () => {
    const lead = (ideology: string, weights = strength) => leadBloc({ society: { ideology } } as never, weights);
    expect(lead('state_socialist')).toBe('labour');
    expect(lead('religious_state')).toBe('traditional');
    expect(lead('state_centric', { ...strength, security: 22 })).toBe('security');
    expect(['business', 'liberal'].includes(lead('pluralist'))).toBe(true);
  });
  it('forms a cabinet with a majority from willing partners and stops when nobody will join', () => {
    const seats = { business: 40, labour: 40, security: 40, traditional: 40, liberal: 40 } as Record<FactionKey, number>;
    const cabinet = formCoalition(seats, factions(), 'liberal');
    expect(cabinet[0]).toBe('liberal');
    expect(seatsOf(seats, cabinet) >= MAJORITY_SEATS).toBe(true);
    expect(cabinet.length).toBe(3);
    expect(seatsOf(seats, cabinet) >= MAJORITY_SEATS + COALITION_CUSHION).toBe(true);
    const hostile = Object.fromEntries(FACTION_KEYS.map(k => [k, 10])) as Record<FactionKey, number>;
    expect(formCoalition(seats, factions(hostile), 'liberal')).toEqual(['liberal']);
  });
  it('lets only content blocs join a cabinet', () => {
    expect(willingPartner(factions() as never, 'labour')).toBe(true);
    expect(willingPartner(factions({ ...content, labour: 30 }) as never, 'labour')).toBe(false);
  });
  it('weights the votes of a bloc by how loyal it is', () => {
    expect(loyalty(80)).toBe(1);
    expect(loyalty(0)).toBe(0);
    expect(loyalty(22.5)).toBe(0.5);
    const s = base();
    const p = record(s), f = factionsFor(s.countries.TUR);
    const full = reliableSeats(p, f, s.day);
    expect(full).toBe(governmentSeats(p));
    const sour = withSatisfaction(s, 'TUR', { [p.coalition[0]]: 10 });
    expect(reliableSeats(record(sour), factionsFor(sour.countries.TUR), sour.day) < full).toBe(true);
  });
  it('counts backing parties from outside the cabinet only while their agreement runs', () => {
    const s = minority(base());
    const outsider = FACTION_KEYS.find(k => !record(s).coalition.includes(k))!;
    const before = reliableSeats(record(s), factionsFor(s.countries.TUR), s.day);
    const backed = withRecord(withSatisfaction(s, 'TUR', { [outsider]: 60 }), 'TUR', { support: { [outsider]: s.day + 5 } });
    expect(reliableSeats(record(backed), factionsFor(backed.countries.TUR), backed.day) > before).toBe(true);
    expect(reliableSeats(record(backed), factionsFor(backed.countries.TUR), backed.day + 6)).toBe(Math.round(record(backed).seats[record(backed).coalition[0]] * loyalty(factionsFor(backed.countries.TUR).satisfaction[record(backed).coalition[0]])));
  });
});

describe('9.8 the chamber in a campaign', () => {
  it('seats every self-governing country on the first pass, with a cabinet that commands a majority', () => {
    const s = base();
    const records = Object.entries(s.world.parliament!.countries);
    expect(records.length > 100).toBe(true);
    for (const [id, p] of records) {
      expect(FACTION_KEYS.reduce((sum, k) => sum + p.seats[k], 0)).toBe(CHAMBER_SEATS);
      expect(p.cabinet).toBe('governing');
      expect(p.coalition.length >= 1).toBe(true);
      expect(mandateFor(s, id).ok).toBe(true);
      expect(p.strike.level).toBe('none');
    }
  });
  it('never touches the simulation seed and is a no-op to repeat on the same day for a calm country', () => {
    const s = base();
    expect(processParliament(s).simulationSeed).toBe(s.simulationSeed);
    expect(day(s).simulationSeed).toBe(s.simulationSeed);
  });
  it('skips annexed and controlled countries', () => {
    const s = makeInitialState();
    s.countries.GRC = { ...s.countries.GRC, controllerCountryId: 'TUR' };
    const after = processParliament({ ...s, day: 1 });
    expect(recordOf(after, 'GRC')).toBeUndefined();
    expect(recordOf(after, 'TUR') === undefined).toBe(false);
  });
  it('reseats the chamber and forms a new cabinet after an election', () => {
    let s = base();
    s = withRecord(s, 'TUR', { coalition: [record(s).coalition[0]], cabinetFormedDay: 0 });
    const c = s.countries.TUR;
    s = { ...s, countries: { ...s.countries, TUR: { ...c, politics: { ...c.politics, factions: { ...factionsFor(c), lastElection: { day: s.day + 1, governmentShare: 55, won: true } } } } } };
    const after = day(s);
    expect(record(after).seatedDay).toBe(after.day);
    expect(record(after).cabinetFormedDay).toBe(after.day);
    expect(seatsOf(record(after).seats, record(after).coalition) >= MAJORITY_SEATS).toBe(true);
    expect(record(after).history[0].kind).toBe('seated');
  });
  it('keeps the strike state and the history through a reseating', () => {
    let s = base();
    s = withRecord(s, 'TUR', { unrest: 55, strike: { ...record(s).strike, level: 'local', disorder: 12 } });
    const c = s.countries.TUR;
    s = { ...s, countries: { ...s.countries, TUR: { ...c, politics: { ...c.politics, factions: { ...factionsFor(c), lastElection: { day: s.day + 1, governmentShare: 52, won: true } } } } } };
    const after = day(s);
    expect(record(after).strike.level).toBe('local');
    expect(record(after).history.length >= 2).toBe(true);
  });
  it('gives non-electoral regimes an appointed assembly with no votes to lose', () => {
    let s = base();
    const id = Object.keys(s.countries).find(k => s.countries[k].politics.regime === 'autocracy' && k !== 'TUR')!;
    s = withRecord(s, id, { coalition: [record(s, id).coalition[0]], minorityDays: 99 });
    const after = days(s, 30);
    expect(record(after, id).motion).toBeUndefined();
    expect(record(after, id).cabinet).toBe('governing');
    expect(mandateFor(after, id).required).toBe(false);
    expect(parliamentView(after, id).electoral).toBe(false);
  });
});

describe('9.8 coalition government', () => {
  it('lets a partner walk out after twenty days of deep unhappiness, and says so', () => {
    let s = base();
    const partner = record(s).coalition[1];
    s = withSatisfaction(s, 'TUR', { [partner]: 30 });
    s = days(s, PARTNER_PATIENCE_DAYS - 1);
    expect(record(s).coalition.includes(partner)).toBe(true);
    expect(record(s).unhappyDays[partner]).toBe(PARTNER_PATIENCE_DAYS - 1);
    s = day(s);
    expect(record(s).coalition.includes(partner)).toBe(false);
    expect(record(s).history[0].kind).toBe('partnerLeft');
    expect(s.sitrep.some(line => line.includes('walked out'))).toBe(true);
  });
  it('forgives a short bad patch: unhappiness drains twice as fast as it builds', () => {
    let s = base();
    const partner = record(s).coalition[1];
    s = days(withSatisfaction(s, 'TUR', { [partner]: 30 }), 6);
    expect(record(s).unhappyDays[partner]).toBe(6);
    s = days(withSatisfaction(s, 'TUR', { [partner]: 60 }), 2);
    expect(record(s).unhappyDays[partner]).toBe(2);
  });
  it('never lets the premier bloc walk out', () => {
    let s = base();
    const lead = record(s).coalition[0];
    s = days(withSatisfaction(s, 'TUR', { [lead]: 0 }), 60);
    expect(record(s).coalition[0]).toBe(lead);
  });
  it('invites a willing bloc, drops one with a snub, and refuses the impossible with a reason', () => {
    let s = minority(base());
    const lead = record(s).coalition[0], other = FACTION_KEYS.find(k => k !== lead)!;
    const refused = applyGameCommand(s, { type: 'parliament/inviteBloc', faction: other });
    expect(record(refused).coalition.includes(other)).toBe(false);
    expect(refused.sitrep[0]).toContain('distrust');
    s = withSatisfaction(s, 'TUR', { [other]: 60 });
    s = applyGameCommand(s, { type: 'parliament/inviteBloc', faction: other });
    expect(record(s).coalition).toEqual([lead, other]);
    expect(record(s).history[0].kind).toBe('partnerJoined');
    const before = factionsFor(s.countries.TUR).satisfaction[other];
    const dropped = applyGameCommand(s, { type: 'parliament/dismissBloc', faction: other });
    expect(record(dropped).coalition).toEqual([lead]);
    expect(factionsFor(dropped.countries.TUR).satisfaction[other] < before).toBe(true);
    expect(applyGameCommand(dropped, { type: 'parliament/dismissBloc', faction: lead }).sitrep[0]).toContain('premier');
  });
  it('buys a confidence-and-supply deal that counts toward the majority and then lapses', () => {
    let s = minority(base());
    const lead = record(s).coalition[0], other = FACTION_KEYS.filter(k => k !== lead).sort((a, b) => record(s).seats[b] - record(s).seats[a])[0];
    s = withSatisfaction(s, 'TUR', { [other]: 50 });
    s = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 500 } }));
    const cost = scaledCostB(s.countries.TUR, 3), treasury = s.countries.TUR.economy.treasury;
    const deal = applyGameCommand(s, { type: 'parliament/courtSupport', faction: other });
    expect(record(deal).support[other]).toBe(deal.day + 120);
    expect(deal.countries.TUR.economy.treasury).toBe(treasury - cost);
    expect(factionsFor(deal.countries.TUR).satisfaction[other] > 50).toBe(true);
    expect(reliableSeats(record(deal), factionsFor(deal.countries.TUR), deal.day) > reliableSeats(record(s), factionsFor(s.countries.TUR), s.day)).toBe(true);
    const again = applyGameCommand(deal, { type: 'parliament/courtSupport', faction: other });
    expect(again.sitrep[0]).toContain('Already backing');
    expect(again.countries.TUR.economy.treasury).toBe(deal.countries.TUR.economy.treasury);
    const poor = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 0 } }));
    expect(applyGameCommand(poor, { type: 'parliament/courtSupport', faction: other }).sitrep[0]).toContain('Insufficient treasury');
  });
  it('scales the price of a deal with the size of the economy', () => {
    const s = minority(base());
    const small = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, gdp: 100 } })), large = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, gdp: 9000 } }));
    const lead = record(s).coalition[0], other = FACTION_KEYS.find(k => k !== lead)!;
    expect(parliamentView(large, 'TUR').blocs.find(b => b.key === other)!.court.costB > parliamentView(small, 'TUR').blocs.find(b => b.key === other)!.court.costB).toBe(true);
  });
  it('makes concessions through the 0.88 courting rules and calms a restless partner', () => {
    let s = base();
    const partner = record(s).coalition[1];
    s = withCountry(withSatisfaction(s, 'TUR', { [partner]: 20 }), 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 500 } }));
    s = withRecord(s, 'TUR', { unhappyDays: { ...record(s).unhappyDays, [partner]: 12 } });
    const done = applyGameCommand(s, { type: 'parliament/concede', faction: partner });
    expect(record(done).unhappyDays[partner]).toBe(0);
    expect(factionsFor(done.countries.TUR).concession?.faction).toBe(partner);
    expect(done.countries.TUR.economy.treasury < 500).toBe(true);
    expect(applyGameCommand(done, { type: 'parliament/concede', faction: partner }).sitrep[0]).toContain('already running');
  });
  it('refuses coalition changes in a caretaker government and in a regime without free votes', () => {
    const s = withRecord(minority(base()), 'TUR', { cabinet: 'caretaker' });
    const other = FACTION_KEYS.find(k => !record(s).coalition.includes(k))!;
    expect(applyGameCommand(withSatisfaction(s, 'TUR', { [other]: 60 }), { type: 'parliament/inviteBloc', faction: other }).sitrep[0]).toContain('caretaker');
    const auto = withCountry(base(), 'TUR', c => ({ ...c, politics: { ...c.politics, regime: 'autocracy' } }));
    expect(applyGameCommand(auto, { type: 'parliament/inviteBloc', faction: 'labour' }).sitrep[0]).toContain('appointed');
  });
  it('lets the AI mend its own coalition with the same invitations the player has', () => {
    let s = base();
    const id = 'DEU';
    expect(s.countries[id].politics.regime).toBe('democracy');
    const lead = record(s, id).coalition[0];
    s = withRecord(s, id, { coalition: [lead], support: {} });
    s = withSatisfaction(s, id, Object.fromEntries(FACTION_KEYS.filter(k => k !== lead).map(k => [k, 60])));
    s = day(s);
    expect(record(s, id).coalition.length > 1).toBe(true);
    expect(mandateFor(s, id).ok).toBe(true);
  });
});

describe('9.8 no confidence, resignation and snap elections', () => {
  it('opens a motion after ten days without a reliable majority and announces it', () => {
    let s = minority(base());
    s = days(s, MOTION_GRACE_DAYS - 1);
    expect(record(s).motion).toBeUndefined();
    s = day(s);
    expect(record(s).motion).toEqual({ openedDay: s.day, voteDay: s.day + MOTION_DAYS });
    expect(record(s).history[0].kind).toBe('motion');
    expect(s.sitrep.some(line => line.includes('motion of no confidence'))).toBe(true);
    expect(parliamentView(s, 'TUR').motion!.daysLeft).toBe(MOTION_DAYS);
  });
  it('pauses the game for the player when something big happens, but not for the AI', () => {
    let s: GameState = { ...minority(base()), speed: 1 };
    s = days(s, MOTION_GRACE_DAYS);
    expect(s.speed).toBe(0);
  });
  it('lets the government survive the vote by rebuilding a majority in time', () => {
    let s = minority(base());
    s = days(s, MOTION_GRACE_DAYS);
    const lead = record(s).coalition[0], rest = FACTION_KEYS.filter(k => k !== lead);
    s = withSatisfaction(s, 'TUR', Object.fromEntries(rest.map(k => [k, 60])));
    s = applyGameCommand(s, { type: 'parliament/inviteBloc', faction: rest.sort((a, b) => record(s).seats[b] - record(s).seats[a])[0] });
    s = applyGameCommand(s, { type: 'parliament/inviteBloc', faction: rest[1] });
    const approval = s.countries.TUR.politics.approval;
    s = days(s, MOTION_DAYS);
    expect(record(s).motion).toBeUndefined();
    expect(record(s).cabinet).toBe('governing');
    expect(record(s).lastVote!.survived).toBe(true);
    expect(record(s).motionCooldownUntil! > s.day).toBe(true);
    expect(s.countries.TUR.politics.approval > approval).toBe(true);
  });
  it('resigns the cabinet after losing the vote and calls a snap election inside a month', () => {
    let s = minority(base());
    s = days(s, MOTION_GRACE_DAYS + MOTION_DAYS);
    expect(record(s).cabinet).toBe('caretaker');
    expect(record(s).motion).toBeUndefined();
    expect(record(s).lastVote!.survived).toBe(false);
    expect(record(s).lastVote!.ayes + record(s).lastVote!.noes).toBe(CHAMBER_SEATS);
    expect(s.countries.TUR.politics.electionDaysRemaining <= SNAP_CAMPAIGN_DAYS).toBe(true);
    expect(record(s).history[0].kind).toBe('resigned');
    expect(s.sitrep.some(line => line.includes('lost the vote of no confidence'))).toBe(true);
  });
  it('keeps a survived government safe from a new motion for ninety days', () => {
    let s = minority(base());
    s = days(s, MOTION_GRACE_DAYS);
    s = withRecord(s, 'TUR', { support: Object.fromEntries(FACTION_KEYS.map(k => [k, s.day + 400])) });
    s = withSatisfaction(s, 'TUR', Object.fromEntries(FACTION_KEYS.map(k => [k, 60])));
    s = days(s, MOTION_DAYS);
    expect(record(s).lastVote!.survived).toBe(true);
    s = withRecord(s, 'TUR', { support: {}, minorityDays: 50 });
    s = days(s, 30);
    expect(record(s).motion).toBeUndefined();
  });
  it('seats a new chamber and a governing cabinet when the snap election is held', () => {
    let s = minority(base());
    s = days(s, MOTION_GRACE_DAYS + MOTION_DAYS);
    expect(record(s).cabinet).toBe('caretaker');
    const c = s.countries.TUR;
    s = { ...s, countries: { ...s.countries, TUR: { ...c, politics: { ...c.politics, factions: { ...factionsFor(c), lastElection: { day: s.day + 1, governmentShare: 54, won: true } } } } } };
    s = day(s);
    expect(record(s).cabinet).toBe('governing');
    expect(record(s).seatedDay).toBe(s.day);
    expect(record(s).motion).toBeUndefined();
  });
  it('holds the real election through the 0.88 layer when the caretaker countdown ends', () => {
    let s = minority(base());
    s = days(s, MOTION_GRACE_DAYS + MOTION_DAYS);
    s = withCountry(s, 'TUR', c => ({ ...c, politics: { ...c.politics, electionDaysRemaining: 0 } }));
    const after = processPoliticalLayer({ ...s, day: s.day + 1 });
    expect(factionsFor(after.countries.TUR).lastElection?.day).toBe(s.day + 1);
  });
  it('lets the player call a snap election with a countdown and a small price in approval', () => {
    const s = base();
    expect(s.countries.TUR.politics.electionDaysRemaining > 60).toBe(true);
    const called = applyGameCommand(s, { type: 'parliament/snapElection' });
    expect(called.countries.TUR.politics.electionDaysRemaining).toBe(SNAP_CAMPAIGN_DAYS);
    expect(called.countries.TUR.politics.approval).toBe(s.countries.TUR.politics.approval - 1);
    expect(record(called).history[0].kind).toBe('snap');
    expect(record(called).cabinet).toBe('governing');
  });
  it('refuses a snap election when one is already near, a motion is pending or the cabinet is a caretaker', () => {
    const near = withCountry(base(), 'TUR', c => ({ ...c, politics: { ...c.politics, electionDaysRemaining: 40 } }));
    expect(applyGameCommand(near, { type: 'parliament/snapElection' }).sitrep[0]).toContain('already close');
    const pending = withRecord(base(), 'TUR', { motion: { openedDay: 1, voteDay: 9 } });
    expect(applyGameCommand(pending, { type: 'parliament/snapElection' }).sitrep[0]).toContain('pending');
    const caretaker = withRecord(base(), 'TUR', { cabinet: 'caretaker' });
    expect(applyGameCommand(caretaker, { type: 'parliament/snapElection' }).sitrep[0]).toContain('caretaker');
  });
});

describe('9.8 what the chamber must allow', () => {
  const other = (s: GameState) => Object.keys(s.countries).find(id => id !== 'TUR' && s.countries[id].politics.regime === 'democracy' && !s.countries[id].annexedBy)!;
  const ready = (s: GameState) => withCountry(s, 'TUR', c => ({ ...c, processedResources: { ...c.processedResources, fuel: 100000 } }));

  it('lets a government with a majority declare war', () => {
    const s = ready(base());
    expect(warDeclarationStatus(s, 'TUR', 'GRC').allowed).toBe(true);
  });
  it('blocks the declaration without a reliable majority and explains why', () => {
    const s = ready(minority(base()));
    const status = warDeclarationStatus(s, 'TUR', 'GRC');
    expect(status.allowed).toBe(false);
    expect((status as { block: string }).block).toBe('parliament');
    expect(warDeclarationReason(status)).toContain('Parliament has not authorised');
    const refused = applyGameCommand(s, { type: 'military/declareWar', targetCountryId: 'GRC' });
    expect(Object.keys(refused.wars).length).toBe(0);
    expect(refused.sitrep[0]).toContain('PARLIAMENT //');
  });
  it('unblocks the declaration once concessions buy a majority', () => {
    let s = ready(minority(base()));
    const lead = record(s).coalition[0], rest = FACTION_KEYS.filter(k => k !== lead).sort((a, b) => record(s).seats[b] - record(s).seats[a]);
    s = withCountry(withSatisfaction(s, 'TUR', Object.fromEntries(rest.map(k => [k, 55]))), 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 900 } }));
    s = applyGameCommand(s, { type: 'parliament/courtSupport', faction: rest[0] });
    s = applyGameCommand(s, { type: 'parliament/courtSupport', faction: rest[1] });
    expect(mandateFor(s, 'TUR').ok).toBe(true);
    expect(warDeclarationStatus(s, 'TUR', 'GRC').allowed).toBe(true);
  });
  it('blocks war during the caretaker period', () => {
    const s = ready(withRecord(base(), 'TUR', { cabinet: 'caretaker' }));
    expect(mandateFor(s, 'TUR').reason).toBe('caretaker');
    expect((warDeclarationStatus(s, 'TUR', 'GRC') as { block: string }).block).toBe('parliament');
  });
  it('holds the AI to the same rule', () => {
    const id = other(base());
    const s = minority(base(), id);
    expect(mandateFor(s, id).ok).toBe(false);
    const target = Object.keys(s.countries).find(k => k !== id && k !== 'TUR')!;
    const prepared = withCountry(s, id, c => ({ ...c, processedResources: { ...c.processedResources, fuel: 100000 } }));
    expect((warDeclarationStatus(prepared, id, target) as { block?: string }).block).not.toBe(undefined);
  });
  it('never requires a mandate before the chamber has met or in a regime without free votes', () => {
    expect(mandateFor(makeInitialState(), 'TUR').required).toBe(false);
    const auto = withCountry(minority(base()), 'TUR', c => ({ ...c, politics: { ...c.politics, regime: 'autocracy' } }));
    expect(mandateFor(auto, 'TUR').ok).toBe(true);
  });
  it('treats a big change of the tax rate as a reform that needs the chamber, and small changes as routine', () => {
    const s = minority(base());
    const rate = s.countries.TUR.economy.taxRate;
    expect(taxReformBlock(s, 'TUR', rate + TAX_REFORM_STEP)).toBe(null);
    expect(taxReformBlock(s, 'TUR', rate + TAX_REFORM_STEP + 1)).toContain('chamber will not pass');
    expect(taxReformBlock(base(), 'TUR', rate + 20)).toBe(null);
    const blocked = applyGameCommand(s, { type: 'economy/setTaxRate', rate: rate + 12 });
    expect(blocked.countries.TUR.economy.taxRate).toBe(rate);
    expect(blocked.sitrep[0]).toContain('PARLIAMENT //');
    expect(applyGameCommand(s, { type: 'economy/setTaxRate', rate: rate + 2 }).countries.TUR.economy.taxRate).toBe(rate + 2);
  });
});

describe('9.8 the strike engine', () => {
  it('names what pushes the unions: each cause appears only when its threshold is crossed', () => {
    const s = base();
    const c = s.countries.TUR, f = factionsFor(c);
    expect(grievanceDrivers(c, f).length).toBe(0);
    const keys = (patch: (x: typeof c) => typeof c, sat = f) => grievanceDrivers(patch(c), sat).map(d => d.key);
    expect(keys(x => ({ ...x, economy: { ...x.economy, inflation: 25 } }))).toEqual(['inflation']);
    expect(keys(x => ({ ...x, economy: { ...x.economy, unemployment: 30 } }))).toEqual(['unemployment']);
    expect(keys(x => ({ ...x, economy: { ...x.economy, treasury: 0 } }))).toEqual(['wages']);
    expect(keys(x => ({ ...x, politics: { ...x.politics, approval: 10 } }))).toEqual(['approval']);
    expect(keys(x => ({ ...x, demographics: { ...x.demographics, welfare: 10 } }))).toEqual(['welfare']);
    expect(keys(x => x, { ...f, satisfaction: { ...f.satisfaction, labour: 10 } })).toEqual(['unions']);
    expect(keys(x => ({ ...x, ministries: { ...x.ministries, allocations: { ...x.ministries.allocations, society: 0 } } }))).toEqual(['austerity']);
  });
  it('stays calm, with no strike and zero grievance, in a healthy country', () => {
    const s = days(base(), 200);
    expect(record(s).unrest).toBe(0);
    expect(record(s).strike.level).toBe('none');
    expect(parliamentView(s, 'TUR').strike.risk).toBe('calm');
  });
  it('escalates unaddressed strikes from local to sectoral to a general strike, in that order', () => {
    let s = strained(base());
    const seen: string[] = [];
    for (let i = 0; i < 160; i++) {
      s = day(s);
      const level = record(s).strike.level;
      if (seen[seen.length - 1] !== level) seen.push(level);
    }
    expect(seen).toEqual(['none', 'local', 'sectoral', 'general']);
    expect(record(s).unrest > STRIKE_START.general).toBe(true);
    expect(record(s).history.some(h => h.kind === 'general')).toBe(true);
  });
  it('lets grievance creep upward on its own while a strike is running', () => {
    const s = strained(base());
    const quiet = withRecord(s, 'TUR', { unrest: 60 });
    const striking = withRecord(s, 'TUR', { unrest: 60, strike: { ...record(s).strike, level: 'local' } });
    expect(parliamentView(striking, 'TUR').strike.dailyChange > parliamentView(quiet, 'TUR').strike.dailyChange).toBe(true);
  });
  it('starts and eases strikes at different grievance levels so they do not flicker', () => {
    expect(strikeLevelFor(49, 'none')).toBe('none');
    expect(strikeLevelFor(50, 'none')).toBe('local');
    expect(strikeLevelFor(40, 'local')).toBe('local');
    expect(strikeLevelFor(34, 'local')).toBe('none');
    expect(strikeLevelFor(95, 'none')).toBe('general');
    expect(strikeLevelFor(60, 'general')).toBe('sectoral');
    expect(strikeLevelFor(0, 'general')).toBe('none');
  });
  it('reports a risk word that follows the meter', () => {
    expect(strikeRisk(0, 'none')).toBe('calm');
    expect(strikeRisk(25, 'none')).toBe('rising');
    expect(strikeRisk(45, 'none')).toBe('danger');
    expect(strikeRisk(10, 'local')).toBe('striking');
  });
  it('heals by itself when conditions return to normal', () => {
    let s = withRecord(base(), 'TUR', { unrest: 80, strike: { ...record(base()).strike, level: 'sectoral' } });
    s = days(s, 400);
    expect(record(s).unrest).toBe(0);
    expect(record(s).strike.level).toBe('none');
    expect(CALM_RELIEF > 0).toBe(true);
  });
  it('turns a long general strike into riots that cost stability and approval, once a month', () => {
    let s = strained(base());
    const stability = s.countries.TUR.politics.stability;
    s = days(s, 220);
    expect(record(s).history.some(h => h.kind === 'riot')).toBe(true);
    expect(s.countries.TUR.politics.stability < stability).toBe(true);
    expect(s.sitrep.concat([]).length >= 0).toBe(true);
    const riots = record(s).history.filter(h => h.kind === 'riot');
    for (let i = 1; i < riots.length; i++) expect(riots[i - 1].day - riots[i].day >= 30).toBe(true);
  });
  it('feeds the regime crisis meter of a government without elections during a general strike', () => {
    let s = withCountry(base(), 'TUR', c => ({ ...c, politics: { ...c.politics, regime: 'autocracy' } }));
    s = strained(s);
    s = withRecord(s, 'TUR', { unrest: 95, strike: { ...record(s).strike, level: 'general' } });
    const before = factionsFor(s.countries.TUR).pressure;
    s = day(s);
    expect(factionsFor(s.countries.TUR).pressure > before).toBe(true);
  });
  it('lowers factory output, trade flow and tax revenue with the level of the strike', () => {
    const levels = ['none', 'local', 'sectoral', 'general'] as const;
    for (let i = 1; i < levels.length; i++) {
      expect(STRIKE_EFFECT[levels[i]].output < STRIKE_EFFECT[levels[i - 1]].output).toBe(true);
      expect(STRIKE_EFFECT[levels[i]].logistics < STRIKE_EFFECT[levels[i - 1]].logistics).toBe(true);
      expect(STRIKE_EFFECT[levels[i]].taxLoss > STRIKE_EFFECT[levels[i - 1]].taxLoss).toBe(true);
    }
    expect(STRIKE_EFFECT.none).toEqual({ output: 1, logistics: 1, taxLoss: 0 });
  });
  it('hands the economy the same modifiers when there is no strike and slower ones when there is', () => {
    const s = base();
    expect(strikePerks(s, 'TUR', NEUTRAL_LEADER)).toBe(NEUTRAL_LEADER);
    const general = withRecord(s, 'TUR', { strike: { ...record(s).strike, level: 'general' } });
    const perks = strikePerks(general, 'TUR', NEUTRAL_LEADER);
    expect(perks.factory).toBe(STRIKE_EFFECT.general.output);
    expect(perks.tax).toBe(1 - STRIKE_EFFECT.general.taxLoss);
    expect(perks.debtInterest).toBe(1);
  });
  it('really cuts the day\'s tax income and steel output through the country tick', () => {
    const s = base();
    const general = withRecord(s, 'TUR', { strike: { ...record(s).strike, level: 'general' } });
    const c = s.countries.TUR;
    const calm = tickCountry(c, 1, false, undefined, strikePerks(s, 'TUR', NEUTRAL_LEADER));
    const struck = tickCountry(c, 1, false, undefined, strikePerks(general, 'TUR', NEUTRAL_LEADER));
    expect(struck.economy.treasury < calm.economy.treasury).toBe(true);
    expect(struck.processedResources.steel < calm.processedResources.steel).toBe(true);
  });
  it('slows contracted trade by the worse of the two ends', () => {
    const s = base();
    expect(strikeLogistics(s, 'TUR', 'GRC')).toBe(1);
    const sectoral = withRecord(s, 'TUR', { strike: { ...record(s).strike, level: 'sectoral' } });
    const general = withRecord(sectoral, 'GRC', { strike: { ...record(sectoral, 'GRC').strike, level: 'general' } });
    expect(strikeLogistics(sectoral, 'TUR', 'GRC')).toBe(STRIKE_EFFECT.sectoral.logistics);
    expect(strikeLogistics(general, 'TUR', 'GRC')).toBe(STRIKE_EFFECT.general.logistics);
  });
});

describe('9.8 negotiating with the unions', () => {
  const restless = (s: GameState) => withCountry(withRecord(s, 'TUR', { unrest: 70 }), 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 500 } }));

  it('settles with a collective agreement: grievance falls, the unions are won over, prices rise a little', () => {
    const s = restless(base());
    const cost = scaledCostB(s.countries.TUR, 4), inflation = s.countries.TUR.economy.inflation, labour = factionsFor(s.countries.TUR).satisfaction.labour;
    const done = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'agreement' });
    expect(record(done).unrest).toBe(40);
    expect(record(done).strike.agreementUntil).toBe(done.day + 120);
    expect(done.countries.TUR.economy.treasury).toBe(500 - cost);
    expect(done.countries.TUR.economy.inflation > inflation).toBe(true);
    expect(factionsFor(done.countries.TUR).satisfaction.labour).toBe(labour + 8);
  });
  it('keeps the unions quiet while the agreement lasts, even when conditions are bad', () => {
    let s = strained(restless(base()));
    s = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 500 } }));
    s = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'agreement' });
    const start = record(s).unrest;
    s = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: -1 } }));
    s = days(s, 30);
    expect(record(s).unrest < start).toBe(true);
  });
  it('shortens the working week at a lasting cost in productivity and business goodwill', () => {
    const s = restless(base());
    const productivity = s.countries.TUR.economy.productivity, business = factionsFor(s.countries.TUR).satisfaction.business;
    const done = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'shorterHours' });
    expect(done.countries.TUR.economy.productivity).toBe(productivity - 2);
    expect(factionsFor(done.countries.TUR).satisfaction.business).toBe(business - 8);
    expect(record(done).unrest).toBe(48);
    expect(talksOptions(done.countries.TUR, record(done).strike, 70, done.day + 20).find(o => o.offer === 'shorterHours')!.reason).toContain('already cut');
  });
  it('pays a wage subsidy every day until it runs out, and stops it when the treasury is empty', () => {
    let s = restless(base());
    s = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'wageSubsidy' });
    expect(record(s).strike.subsidyUntil).toBe(s.day + 180);
    const before = s.countries.TUR.economy.treasury;
    s = day(s);
    expect(s.countries.TUR.economy.treasury < before).toBe(true);
    s = withCountry(s, 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 0 } }));
    s = day(s);
    expect(record(s).strike.subsidyUntil).toBeUndefined();
  });
  it('breaks a strike by force at a cost in approval, the liberals, reputation and public order', () => {
    const s = restless(base());
    const c = s.countries.TUR, f = factionsFor(c);
    const done = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'crackdown' });
    const after = done.countries.TUR;
    expect(after.politics.approval).toBe(c.politics.approval - 4);
    expect(after.diplomacy.reputation).toBe(c.diplomacy.reputation - 3);
    expect(factionsFor(after).satisfaction.labour).toBe(f.satisfaction.labour - 12);
    expect(factionsFor(after).satisfaction.liberal).toBe(f.satisfaction.liberal - 8);
    expect(record(done).strike.disorder).toBe(10);
    expect(record(done).unrest).toBe(52);
  });
  it('makes each further offer within a year less effective and enforces a fortnight between talks', () => {
    let s = restless(base());
    s = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'crackdown' });
    const blocked = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'shorterHours' });
    expect(blocked.sitrep[0]).toContain('talk again in');
    s = withRecord(s, 'TUR', { unrest: 70 });
    s = { ...s, day: s.day + 14 };
    const second = talksOptions(s.countries.TUR, record(s).strike, 70, s.day).find(o => o.offer === 'agreement')!;
    expect(second.relief).toBe(21);
    expect(second.allowed).toBe(true);
  });
  it('does not open talks when the unions have no complaint', () => {
    const s = withCountry(base(), 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: 500 } }));
    const done = applyGameCommand(s, { type: 'parliament/negotiate', offer: 'agreement' });
    expect(done.sitrep[0]).toContain('no complaint');
    expect(done.countries.TUR.economy.treasury).toBe(500);
  });
  it('still lets a broke government try the offers that cost nothing', () => {
    const s = withCountry(withRecord(base(), 'TUR', { unrest: 70 }), 'TUR', c => ({ ...c, economy: { ...c.economy, treasury: -5 } }));
    const options = talksOptions(s.countries.TUR, record(s).strike, 70, s.day);
    expect(options.find(o => o.offer === 'agreement')!.allowed).toBe(false);
    expect(options.find(o => o.offer === 'wageSubsidy')!.allowed).toBe(false);
    expect(options.find(o => o.offer === 'shorterHours')!.allowed).toBe(true);
    expect(options.find(o => o.offer === 'crackdown')!.allowed).toBe(true);
  });
  it('lets the AI answer a strike with the same offers and the same prices', () => {
    let s = base();
    s = withRecord(s, 'DEU', { unrest: 75, strike: { ...record(s, 'DEU').strike, level: 'sectoral' } });
    s = withCountry(s, 'DEU', c => ({ ...c, economy: { ...c.economy, treasury: 800 } }));
    const treasury = s.countries.DEU.economy.treasury;
    s = day(s);
    expect(record(s, 'DEU').strike.agreementUntil).toBe(s.day + 120);
    expect(s.countries.DEU.economy.treasury < treasury).toBe(true);
  });
  it('has the AI break a general strike when it cannot afford to settle', () => {
    let s = base();
    s = withRecord(s, 'DEU', { unrest: 95, strike: { ...record(s, 'DEU').strike, level: 'general' } });
    s = withCountry(s, 'DEU', c => ({ ...c, economy: { ...c.economy, treasury: 0 } }));
    s = day(s);
    expect(record(s, 'DEU').strike.disorder > 0).toBe(true);
    expect(record(s, 'DEU').strike.lastTalksDay).toBe(s.day);
  });
});

describe('9.8 the window\'s view of the engine', () => {
  it('is empty before the chamber has met', () => {
    const view = parliamentView(makeInitialState(), 'TUR');
    expect(view.ready).toBe(false);
    expect(view.blocs).toEqual([]);
  });
  it('describes every bloc and agrees with the engine about seats and the cabinet', () => {
    const s = base();
    const view = parliamentView(s, 'TUR');
    expect(view.ready).toBe(true);
    expect(view.blocs.map(b => b.key).sort()).toEqual([...FACTION_KEYS].sort());
    expect(view.blocs.reduce((sum, b) => sum + b.seats, 0)).toBe(CHAMBER_SEATS);
    expect(view.cabinetSeats).toBe(governmentSeats(record(s)));
    expect(view.blocs.filter(b => b.inCabinet).length).toBe(record(s).coalition.length);
    expect(view.blocs.filter(b => b.lead).length).toBe(1);
    expect(view.mandate.ok).toBe(true);
  });
  it('survives a round trip through JSON, which is how the store compares previews', () => {
    const s = strained(base());
    const view = parliamentView(days(s, 40), 'TUR');
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });
  it('forecasts when the next stage of strikes begins', () => {
    const s = strained(base());
    const view = parliamentView(s, 'TUR');
    expect(view.strike.daysToStrike! > 0).toBe(true);
    expect(view.strike.drivers.length >= 3).toBe(true);
    expect(parliamentView(base(), 'TUR').strike.daysToStrike).toBe(null);
  });
  it('uses only reasons the five-language catalogue knows', () => {
    const known = new Set([...MERGED_CATALOG_GROUP.flatMap(g => Object.keys(g)), ...Object.keys(UI_CATALOG_088_E)]);
    const views = [base(), minority(base()), withRecord(base(), 'TUR', { cabinet: 'caretaker' }), withCountry(base(), 'TUR', c => ({ ...c, politics: { ...c.politics, regime: 'autocracy' } })), strained(base()), withRecord(base(), 'TUR', { motion: { openedDay: 1, voteDay: 5 } })]
      .map(s => parliamentView(s, 'TUR'));
    const reasons = new Set<string>();
    for (const v of views) {
      for (const b of v.blocs) for (const status of [b.invite, b.dismiss, b.court]) reasons.add(status.reason);
      reasons.add(v.bargain.reason); reasons.add(v.snap.reason);
      for (const t of v.strike.talks) reasons.add(t.reason);
    }
    const unknown = [...reasons].filter(reason => reason !== 'Available.' && !known.has(reason));
    expect(unknown).toEqual([]);
    expect(fillReason('{0} left after {1} days', ['Labour', '5'])).toBe('Labour left after 5 days');
  });
});

describe('9.8 saves, determinism and the long run', () => {
  it('accepts saves with and without the chamber and keeps it through snapshot and migration', () => {
    const s = strained(days(base(), 5));
    expect(validParliamentState(makeInitialState())).toBe(true);
    expect(validParliamentState(s)).toBe(true);
    const loaded = migrateSave(snapshotGame(s));
    expect(loaded === null).toBe(false);
    expect(JSON.stringify(loaded!.world.parliament)).toBe(JSON.stringify(s.world.parliament));
  });
  it('rejects a corrupt chamber', () => {
    const s = withRecord(base(), 'TUR', { motion: { openedDay: 1, voteDay: 9 } });
    const bad = (mutate: (p: any) => void) => { const copy = structuredClone(s) as any; mutate(copy.world.parliament.countries); return validParliamentState(copy); };
    expect(bad(() => undefined)).toBe(true);
    expect(bad(c => { c.TUR.seats.labour += 1; })).toBe(false);
    expect(bad(c => { c.TUR.seats.labour = -1; })).toBe(false);
    expect(bad(c => { c.XXX = c.TUR; })).toBe(false);
    expect(bad(c => { c.TUR.coalition = ['labour', 'labour']; })).toBe(false);
    expect(bad(c => { c.TUR.coalition = []; })).toBe(false);
    expect(bad(c => { c.TUR.coalition = ['clergy']; })).toBe(false);
    expect(bad(c => { c.TUR.cabinet = 'exiled'; })).toBe(false);
    expect(bad(c => { c.TUR.unrest = 140; })).toBe(false);
    expect(bad(c => { c.TUR.strike.level = 'riot'; })).toBe(false);
    expect(bad(c => { c.TUR.strike.disorder = -1; })).toBe(false);
    expect(bad(c => { c.TUR.motion = { openedDay: 9, voteDay: 1 }; })).toBe(false);
    expect(bad(c => { c.TUR.history = 'none'; })).toBe(false);
    expect(validParliamentState({ ...s, world: { ...s.world, parliament: 'x' } })).toBe(false);
  });
  it('produces identical chambers from identical inputs', () => {
    const play = () => days(strained(base()), 120);
    expect(JSON.stringify(play().world.parliament)).toBe(JSON.stringify(play().world.parliament));
  });
  it('plays 150 whole days through the real tick, keeps every number finite and every chamber at 200 seats', () => {
    let s = makeInitialState();
    s.world.tutorial.active = false; s.eventCooldownUntil = 100000; s.advisorCooldownUntil = 100000;
    for (let i = 0; i < 150; i++) s = tickGame({ ...s, speed: 1 });
    const records = Object.values(s.world.parliament!.countries);
    expect(records.length > 100).toBe(true);
    for (const p of records) {
      expect(FACTION_KEYS.reduce((sum, k) => sum + p.seats[k], 0)).toBe(CHAMBER_SEATS);
      expect(Number.isFinite(p.unrest) && Number.isFinite(p.strike.disorder)).toBe(true);
    }
    expect(validParliamentState(s)).toBe(true);
    expect(Number.isFinite(s.countries.TUR.economy.treasury)).toBe(true);
  });
});

describe('9.8 text and layout', () => {
  it('has four non-empty translations for every key and keeps placeholders in step', () => {
    for (const [key, translations] of Object.entries(UI_CATALOG_098P)) {
      expect(translations.length).toBe(4);
      const holes = (text: string) => (text.match(/\{\d\}/g) ?? []).sort().join('');
      for (const text of translations) {
        expect(text.trim().length > 0).toBe(true);
        expect(holes(text)).toBe(holes(key));
      }
    }
  });
  it('translates the five bloc names', () => {
    for (const label of Object.values(BLOC_LABEL)) expect(label in UI_CATALOG_098P || MERGED_CATALOG_GROUP.some(g => label in g)).toBe(true);
  });
  it('is in the group and never shadows an earlier translation with a different one', () => {
    const at = MERGED_CATALOG_GROUP.indexOf(UI_CATALOG_098P);
    expect(at).toBeGreaterThan(-1);
    for (const earlier of MERGED_CATALOG_GROUP.slice(0, at)) {
      for (const key of Object.keys(UI_CATALOG_098P)) if (key in earlier) expect(JSON.stringify(earlier[key])).toBe(JSON.stringify(UI_CATALOG_098P[key]));
    }
  });
  it('lays out exactly the seats it is given, in wedges, inside the drawing', () => {
    for (const counts of [[34, 54, 46, 31, 35], [200, 0, 0, 0, 0], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0]]) {
      const dots = hemicycleLayout(counts);
      expect(dots.length).toBe(counts.reduce((a, b) => a + b, 0));
      counts.forEach((count, group) => expect(dots.filter(d => d.group === group).length).toBe(count));
      for (const d of dots) {
        expect(d.x >= 0 && d.x <= HEMICYCLE_WIDTH).toBe(true);
        expect(d.y >= 0 && d.y <= HEMICYCLE_HEIGHT).toBe(true);
      }
    }
    expect(JSON.stringify(hemicycleLayout([3, 4, 5]))).toBe(JSON.stringify(hemicycleLayout([3, 4, 5])));
    expect(HEMICYCLE_ORDER.length).toBe(5);
  });
  it('seats the far-left bloc to the left of the far-right one', () => {
    const dots = hemicycleLayout([60, 0, 0, 0, 60]);
    const mean = (g: number) => dots.filter(d => d.group === g).reduce((s, d) => s + d.x, 0) / 60;
    expect(mean(0) < mean(4)).toBe(true);
  });
});
