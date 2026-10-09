import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import type { GameState } from '../domain/game';
import type { Flight } from '../domain/flights';
import { applyGameCommand } from '../engine/commands';
import { tickGame } from '../engine/tick';
import { activeClockInterval } from '../engine/clockState';
import { addTreaty, changeRelations, relationFor } from '../engine/systems/diplomacy';
import { AI_FLIGHT_WINDOW_DAYS, MAX_AI_FLIGHTS_PER_WINDOW, dispatchFlight, processTradeFlights, recentAiFlights, TRADE_FLIGHT_INTERVAL_DAYS } from '../engine/systems/flightHooks';
import { flights, processFlights, travelDays } from '../engine/systems/flights';
import { requestDiplomacy } from '../engine/systems/livingEconomy';
import { diplomaticMissionStatus, sendDiplomaticMission } from '../engine/systems/policyPressure';
import { aiProposeAgreement } from '../engine/systems/treaties';
import { angularDistance, arcPathData, greatCircleArc, greatCirclePoint, initialBearing, placeAircraft, renderDay, screenHeading, visibleOnGlobe, type LonLat, type ScreenPoint } from '../map/flightPath';
import { etaDays, newsFlightKind, playerFlightsInTransit, recentlyLanded } from '../map/flightPresentation';
import { snapshotGame } from '../persistence/snapshot';
import { validFlights } from '../persistence/validation089';
import { UI_CATALOG_089_I } from '../i18n/uiCatalog089I';

let cached: GameState | null = null;
const base = (): GameState => {
  const s = structuredClone(cached ??= makeInitialState());
  s.world.tutorial.active = false; s.eventCooldownUntil = 10000; s.advisorCooldownUntil = 10000;
  return s;
};
const score = (s: GameState, a = 'TUR', b = 'GRC') => relationFor(s.countries[a], b).score;
const run = (s: GameState, days: number) => { for (let i = 0; i < days; i++) s = tickGame({ ...s, activeEvent: null, activeAdvisor: null }); return s; };

describe('0.89 diplomatic missions fly and their goodwill lands on arrival', () => {
  it('schedules a diplomatic jet carrying the computed goodwill instead of applying it at once', () => {
    const s = base(), gain = diplomaticMissionStatus(s, 'TUR', 'GRC').gain;
    const sent = applyGameCommand(s, { type: 'diplomacy/improveRelations', targetCountryId: 'GRC' });
    const [flight] = flights(sent);
    expect(flights(sent)).toHaveLength(1);
    expect(flight).toMatchObject({ kind: 'diplomatic', fromId: 'TUR', toId: 'GRC', status: 'enroute', payload: { type: 'relations', aId: 'TUR', bId: 'GRC', amount: gain } });
    expect(flight.arriveDay - flight.departDay).toBe(travelDays('diplomatic', 'TUR', 'GRC'));
    // Cost and cooldown apply at once, as before.
    expect(sent.countries.TUR.economy.treasury).toBeLessThan(s.countries.TUR.economy.treasury);
    expect(diplomaticMissionStatus(sent, 'TUR', 'GRC').allowed).toBe(false);
    // No goodwill before the delegation lands.
    expect(score(sent)).toBe(score(s));
    expect(score(processFlights({ ...sent, day: flight.arriveDay - 1 }))).toBe(score(s));
    expect(score(processFlights({ ...sent, day: flight.arriveDay }))).toBe(score(s) + gain);
    expect(sent.sitrep[0]).toContain(`day ${flight.arriveDay}`);
  });

  it('lands inside the daily tick: relations differ from a no-mission campaign only from the arrival day', () => {
    const s = base(), gain = diplomaticMissionStatus(s, 'TUR', 'USA').gain;
    let sent = sendDiplomaticMission(s, 'TUR', 'USA'), idle = s;
    const arrive = flights(sent)[0].arriveDay;
    while (sent.day < arrive - 1) { sent = run(sent, 1); idle = run(idle, 1); }
    expect(score(sent, 'TUR', 'USA')).toBe(score(idle, 'TUR', 'USA'));
    sent = run(sent, 1); idle = run(idle, 1);
    expect(sent.day).toBe(arrive);
    expect(score(sent, 'TUR', 'USA') - score(idle, 'TUR', 'USA')).toBeCloseTo(gain, 6);
    expect(sent.sitrep.some((line) => line.startsWith('DIPLOMACY // Delegation arrived in'))).toBe(true);
    // Delivered once: a further day adds nothing extra.
    const later = run(sent, 1), idleLater = run(idle, 1);
    expect(score(later, 'TUR', 'USA') - score(idleLater, 'TUR', 'USA')).toBeCloseTo(gain, 6);
  }, 60_000);

  it('sends a jet with embassy and trade-pact proposals', () => {
    let s = changeRelations(base(), 'TUR', 'GRC', 60);
    s = requestDiplomacy(s, 'GRC', 'trade_pact');
    expect(flights(s)).toHaveLength(1);
    expect(flights(s)[0]).toMatchObject({ kind: 'diplomatic', fromId: 'TUR', toId: 'GRC', label: 'Trade pact proposal', payload: { type: 'none' } });
    expect(validFlights(snapshotGame(s))).toBe(true);
  });
});

describe('0.89 trade starts one cargo flight, not one per daily shipment', () => {
  it('flies once when an import deal is signed and about once a month afterwards', () => {
    let s = addTreaty(base(), 'TUR', 'AZE', 'trade');
    s = applyGameCommand(s, { type: 'trade/createImport', targetCountryId: 'AZE', resource: 'oil' });
    const cargo = (x: GameState) => flights(x).filter((f) => f.kind === 'cargo' && f.fromId === 'AZE' && f.toId === 'TUR');
    expect(cargo(s)).toHaveLength(1);
    // Thirty consecutive days of the monthly rule add exactly one more flight for the deal.
    let monthly = 0, t = { ...s, world: { ...s.world, flights: [] as Flight[] } };
    for (let i = 1; i <= TRADE_FLIGHT_INTERVAL_DAYS; i++) {
      const before = cargo(t).length;
      t = processTradeFlights({ ...t, day: s.day + i });
      monthly += cargo(t).length - before;
    }
    expect(monthly).toBe(1);
  });

  it('keeps daily ticks from adding a flight per delivery', () => {
    let s = addTreaty(base(), 'TUR', 'AZE', 'trade');
    s = applyGameCommand(s, { type: 'trade/createImport', targetCountryId: 'AZE', resource: 'oil' });
    const total = (x: GameState) => flights(x).filter((f) => f.fromId === 'AZE' && f.toId === 'TUR').length;
    s = run(s, 3);
    expect(total(s)).toBeLessThanOrEqual(2);
  }, 60_000);

  it('flies the first shipment of a new supply contract and each monthly delivery', () => {
    const s = base();
    const contract = { id: 'C-1', sellerId: 'DEU', buyerId: 'TUR', good: 'engines' as const, quantity: 2, price: 1, nextDeliveryDay: s.day + 30, expiresDay: s.day + 365, active: true, missedDeliveries: 0 };
    const withContract = { ...s, industrialContracts: { ...s.industrialContracts, [contract.id]: contract } };
    // Delivery processed today (next delivery one month out) → one cargo flight.
    expect(flights(processTradeFlights(withContract)).filter((f) => f.kind === 'cargo')).toHaveLength(1);
    // A day later nothing new.
    expect(flights(processTradeFlights({ ...withContract, day: s.day + 1 }))).toHaveLength(0);
  });

  it('shows one cargo aircraft for a spot order or a new supply contract placed through the command', () => {
    let s = addTreaty(base(), 'TUR', 'USA', 'trade');
    s = changeRelations(s, 'TUR', 'USA', 60);
    const fromUsa = (x: GameState) => flights(x).filter((f) => f.kind === 'cargo' && f.fromId === 'USA' && f.toId === 'TUR');
    const spot = applyGameCommand(s, { type: 'industry/order', partnerId: 'USA', good: 'engines', quantity: 1, direction: 'buy', years: 0 });
    expect(fromUsa(spot)).toHaveLength(1);
    const contract = applyGameCommand(s, { type: 'industry/order', partnerId: 'USA', good: 'engines', quantity: 1, direction: 'buy', years: 1 });
    expect(Object.keys(contract.industrialContracts).length).toBe(Object.keys(s.industrialContracts).length + 1);
    expect(fromUsa(contract)).toHaveLength(1);
    expect(fromUsa(contract)[0].label).toBe('Supply contract cargo');
    // The next days of the contract do not add flights until the first monthly delivery.
    let t = contract;
    for (let i = 1; i < 29; i++) t = processTradeFlights({ ...t, day: contract.day + i });
    expect(fromUsa(t)).toHaveLength(1);
  });
});

describe('0.89 AI flights are rate-limited; player flights always show', () => {
  it('limits visual AI–AI flights per window and frees the window as days pass', () => {
    let s = base();
    for (let i = 0; i < 6; i++) s = dispatchFlight(s, { kind: 'cargo', fromId: 'BRA', toId: 'ARG', label: 'Trade cargo' });
    expect(recentAiFlights(s)).toHaveLength(MAX_AI_FLIGHTS_PER_WINDOW);
    // Player-related flights are never limited.
    for (let i = 0; i < 3; i++) s = dispatchFlight(s, { kind: 'diplomatic', fromId: 'TUR', toId: 'GRC', label: 'Alliance summit' });
    expect(flights(s).filter((f) => f.fromId === 'TUR')).toHaveLength(3);
    // A flight that carries a payload is the rule itself and always flies.
    s = dispatchFlight(s, { kind: 'diplomatic', fromId: 'BRA', toId: 'ARG', label: 'Diplomatic mission', payload: { type: 'relations', aId: 'BRA', bId: 'ARG', amount: 4 } });
    expect(recentAiFlights(s)).toHaveLength(MAX_AI_FLIGHTS_PER_WINDOW + 1);
    // After the window the AI may fly again.
    const later = { ...s, day: s.day + AI_FLIGHT_WINDOW_DAYS };
    expect(recentAiFlights(dispatchFlight(later, { kind: 'cargo', fromId: 'BRA', toId: 'ARG', label: 'Trade cargo' }))).toHaveLength(1);
  });

  it('shows a delegation for a new AI agreement within the limit', () => {
    const s = changeRelations(base(), 'BRA', 'ARG', 200);
    const result = aiProposeAgreement(s, 'BRA', 'ARG', 'nonAggression');
    expect(result.accepted).toBe(true);
    expect(flights(result.state).filter((f) => f.kind === 'diplomatic' && f.fromId === 'BRA' && f.toId === 'ARG')).toHaveLength(1);
  });

  it('never has more than the AI limit in any window during a headless campaign', () => {
    let s = base(), max = 0;
    for (let i = 0; i < 45; i++) {
      s = tickGame({ ...s, activeEvent: null, activeAdvisor: null });
      const visualAi = recentAiFlights(s).filter((f) => f.payload.type === 'none').length;
      max = Math.max(max, visualAi);
    }
    expect(max).toBeLessThanOrEqual(MAX_AI_FLIGHTS_PER_WINDOW);
    expect(validFlights(snapshotGame(s))).toBe(true);
  }, 120_000);
});

describe('0.89 flight map geometry (pure helpers)', () => {
  const lin: (p: LonLat) => ScreenPoint = ([lon, lat]) => [600 + lon * 3, 350 - lat * 3];

  it('interpolates along the great circle', () => {
    expect(greatCirclePoint([0, 0], [90, 0], 0.5)[0]).toBeCloseTo(45, 6);
    expect(greatCirclePoint([0, 0], [90, 0], 0.5)[1]).toBeCloseTo(0, 6);
    expect(greatCirclePoint([10, 20], [30, 40], 0)).toEqual([10, 20].map((v) => expect.closeTo(v, 6)));
    expect(greatCirclePoint([10, 20], [30, 40], 1)[1]).toBeCloseTo(40, 6);
    // Ankara → Washington bows north of the straight lat/lon line, as real routes do.
    const mid = greatCirclePoint([32.9, 39.9], [-77, 38.9], 0.5);
    expect(mid[1]).toBeGreaterThan(50);
    // Same point: no NaN.
    expect(greatCirclePoint([5, 5], [5, 5], 0.4)).toEqual([5, 5]);
    expect(angularDistance([0, 0], [180, 0])).toBeCloseTo(Math.PI, 6);
    const arc = greatCircleArc([0, 0], [90, 0], 4);
    expect(arc).toHaveLength(5);
    expect(arc[2][0]).toBeCloseTo(45, 6);
  });

  it('computes bearings and screen headings', () => {
    expect(initialBearing([0, 0], [10, 0])).toBeCloseTo(90, 6);
    expect(initialBearing([0, 0], [0, 10])).toBeCloseTo(0, 6);
    expect(screenHeading([0, 0], [10, 0])).toBeCloseTo(0, 6);
    expect(screenHeading([0, 0], [0, 10])).toBeCloseTo(90, 6);
    const east = placeAircraft([0, 0], [40, 0], 0.5, lin)!;
    expect(east.point[0]).toBeCloseTo(660, 3);
    expect(east.heading).toBeCloseTo(0, 3);
    const north = placeAircraft([0, 0], [0, 40], 1, lin)!;
    expect(north.heading).toBeCloseTo(-90, 3);
    expect(placeAircraft([0, 0], [40, 0], 0.5, () => null)).toBeNull();
  });

  it('hides the far side of the globe and breaks lines at gaps and seams', () => {
    expect(visibleOnGlobe([10, 10], [0, 0])).toBe(true);
    expect(visibleOnGlobe([170, 0], [0, 0])).toBe(false);
    const project = (p: LonLat) => (p[0] > 20 && p[0] < 30 ? null : lin(p));
    const d = arcPathData(greatCircleArc([0, 0], [50, 0], 10), project);
    expect(d.match(/M/g)).toHaveLength(2);
    const seam = arcPathData([[170, 0], [179, 0], [-179, 0], [-170, 0]], ([lon, lat]) => [600 + lon * 3, 350 - lat], 400);
    expect(seam.match(/M/g)).toHaveLength(2);
  });

  it('clamps the render clock below the next simulation day', () => {
    expect(renderDay(10, 0.5)).toBe(10.5);
    expect(renderDay(10, 3)).toBeLessThan(11);
    expect(renderDay(10, Number.NaN)).toBe(10);
    expect(renderDay(10, -1)).toBe(10);
  });

  it('stops the render clock whenever the simulation clock is stopped', () => {
    const s = base();
    expect(activeClockInterval({ ...s, speed: 0 })).toBeNull();
    expect(activeClockInterval({ ...s, speed: 1, campaignStatus: 'active' })).toBe(15_000);
    expect(activeClockInterval({ ...s, speed: 1, actionReceipt: { title: 'x' } })).toBeNull();
  });
});

describe('0.89 flight presentation', () => {
  it('lists player flights by arrival and tags news lines', () => {
    let s = base();
    s = sendDiplomaticMission(s, 'TUR', 'USA');
    s = sendDiplomaticMission(s, 'TUR', 'GRC');
    s = dispatchFlight(s, { kind: 'cargo', fromId: 'BRA', toId: 'ARG', label: 'Trade cargo' });
    const transit = playerFlightsInTransit(s.world.flights, 'TUR');
    expect(transit.map((f) => f.toId)).toEqual(['GRC', 'USA']);
    expect(etaDays(transit[0], s.day)).toBe(travelDays('diplomatic', 'TUR', 'GRC'));
    const landed = processFlights({ ...s, day: transit[0].arriveDay });
    expect(recentlyLanded(landed.world.flights, landed.day).map((f) => f.toId)).toContain('GRC');
    expect(newsFlightKind('DIPLOMACY // Delegation departed for Greece')).toBe('diplomatic');
    expect(newsFlightKind('TRADE // OIL import contract signed')).toBe('cargo');
    expect(newsFlightKind('WAR // Front collapsed')).toBeNull();
  });

  it('translates every flight label and template into four languages', () => {
    const labels = ['Diplomatic mission', 'Embassy proposal', 'Trade pact proposal', 'Embassy delegation', 'Trade pact delegation', 'Non-aggression talks', 'Alliance summit', 'Bloc summit', 'Treasury grant', 'Incoming proposal', 'Trade cargo', 'Supply contract cargo', 'Exchange purchase', 'Aid shipment'];
    for (const label of labels) expect(UI_CATALOG_089_I[label]).toBeDefined();
    for (const [key, values] of Object.entries(UI_CATALOG_089_I)) {
      expect(values).toHaveLength(4);
      for (const value of values) {
        expect(value.trim().length).toBeGreaterThan(0);
        for (const slot of key.match(/\{\d+\}/g) ?? []) expect(value).toContain(slot);
      }
    }
  });
});
