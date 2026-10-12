import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { tickGame } from '../engine/tick';
import { distanceKm, flightProgress, flights, MAX_FLIGHTS, processFlights, scheduleFlight, travelDays } from '../engine/systems/flights';
import { relationFor } from '../engine/systems/diplomacy';
import { migrateSave } from '../persistence/migrations';
import { snapshotGame } from '../persistence/snapshot';
import { validFlights } from '../persistence/validation089';

const base = () => { const s = makeInitialState(); s.world.tutorial.active = false; s.eventCooldownUntil = 10000; s.advisorCooldownUntil = 10000; return s; };

describe('0.89 flights', () => {
  it('measures realistic great-circle distances', () => {
    expect(distanceKm('TUR', 'GRC')).toBeGreaterThan(400); expect(distanceKm('TUR', 'GRC')).toBeLessThan(1200);
    expect(distanceKm('TUR', 'USA')).toBeGreaterThan(9000); expect(distanceKm('TUR', 'USA')).toBeLessThan(11500);
    expect(distanceKm('FRA', 'DEU')).toBeLessThan(1000);
  });

  it('gives short hops 1–2 days and long hauls more, within sensible bounds', () => {
    expect(travelDays('diplomatic', 'TUR', 'GRC')).toBe(1);
    expect(travelDays('diplomatic', 'TUR', 'USA')).toBe(2);
    expect(travelDays('cargo', 'TUR', 'GRC')).toBe(2);
    expect(travelDays('cargo', 'TUR', 'USA')).toBeGreaterThanOrEqual(4);
    expect(travelDays('cargo', 'TUR', 'AUS')).toBeLessThanOrEqual(6);
  });

  it('delivers goods once, on the arrival day, then prunes the landed flight', () => {
    let s = scheduleFlight(base(), { kind: 'cargo', fromId: 'SAU', toId: 'TUR', label: 'Oil cargo', payload: { type: 'goods', countryId: 'TUR', good: 'oil', amount: 25 } });
    const f = flights(s)[0], oil = s.countries.TUR.resources.oil;
    expect(f.arriveDay - f.departDay).toBe(travelDays('cargo', 'SAU', 'TUR'));
    s = processFlights({ ...s, day: f.arriveDay - 1 });
    expect(s.countries.TUR.resources.oil).toBe(oil);
    s = processFlights({ ...s, day: f.arriveDay });
    expect(s.countries.TUR.resources.oil).toBeCloseTo(oil + 25);
    expect(flights(s)[0].status).toBe('landed');
    s = processFlights({ ...s, day: f.arriveDay + 1 });
    expect(s.countries.TUR.resources.oil).toBeCloseTo(oil + 25);
    s = processFlights({ ...s, day: f.arriveDay + 5 });
    expect(flights(s)).toHaveLength(0);
  });

  it('applies diplomatic goodwill on arrival', () => {
    let s = base();
    const before = relationFor(s.countries.TUR, 'GRC').score;
    s = scheduleFlight(s, { kind: 'diplomatic', fromId: 'TUR', toId: 'GRC', label: 'Diplomatic mission', payload: { type: 'relations', aId: 'TUR', bId: 'GRC', amount: 5 } });
    expect(relationFor(s.countries.TUR, 'GRC').score).toBe(before);
    s = processFlights({ ...s, day: flights(s)[0].arriveDay });
    expect(relationFor(s.countries.TUR, 'GRC').score).toBeGreaterThan(before);
  });

  it('runs inside the daily tick and reports progress for rendering', () => {
    let s = scheduleFlight(base(), { kind: 'cargo', fromId: 'BRA', toId: 'TUR', label: 'Food cargo' });
    const f = flights(s)[0];
    expect(flightProgress(f, f.departDay)).toBe(0); expect(flightProgress(f, f.arriveDay)).toBe(1);
    for (let i = 0; i < f.arriveDay - f.departDay; i++) s = tickGame({ ...s, activeEvent: null });
    expect(flights(s)[0]?.status ?? 'landed').toBe('landed');
  });

  it('caps visual flights but never lands cargo early to make room (Phase 4)', () => {
    let s = base();
    const oil = s.countries.TUR.resources.oil;
    for (let i = 0; i < MAX_FLIGHTS; i++) s = scheduleFlight(s, { kind: 'diplomatic', fromId: 'GRC', toId: 'TUR', label: 'Diplomatic mission' });
    for (let i = 0; i < MAX_FLIGHTS + 3; i++) s = scheduleFlight(s, { kind: 'cargo', fromId: 'SAU', toId: 'TUR', label: 'Oil cargo', payload: { type: 'goods', countryId: 'TUR', good: 'oil', amount: 1 } });
    // Visual flights made room; every cargo is still in the air and nothing was delivered before its arrival day.
    expect(flights(s).filter((f) => f.payload.type === 'none')).toHaveLength(0);
    expect(flights(s).filter((f) => f.payload.type === 'goods' && f.status === 'enroute')).toHaveLength(MAX_FLIGHTS + 3);
    expect(s.countries.TUR.resources.oil).toBe(oil);
    expect(validFlights(snapshotGame(s))).toBe(true);
    const arrive = flights(s)[0].arriveDay;
    s = processFlights({ ...s, day: arrive });
    expect(s.countries.TUR.resources.oil).toBeCloseTo(oil + MAX_FLIGHTS + 3);
    expect(flights(s).every((f) => f.status === 'landed' && f.delivered === 1 && f.lost === 0)).toBe(true);
  });

  it('ignores invalid endpoints and keeps saves valid with or without flights', () => {
    const s = base();
    expect(scheduleFlight(s, { kind: 'cargo', fromId: 'TUR', toId: 'TUR', label: 'x' })).toBe(s);
    expect(validFlights(snapshotGame(s))).toBe(true);
    const flying = scheduleFlight(s, { kind: 'diplomatic', fromId: 'TUR', toId: 'GRC', label: 'Diplomatic mission' });
    expect(validFlights(snapshotGame(flying))).toBe(true);
    expect(migrateSave(snapshotGame(flying))?.world.flights).toHaveLength(1);
    const bad = snapshotGame(flying); bad.world.flights![0].arriveDay = bad.world.flights![0].departDay + 40;
    expect(validFlights(bad)).toBe(false);
    const bad2 = snapshotGame(flying); bad2.world.flights![0].payload = { type: 'goods', countryId: 'TUR', good: 'oil', amount: Number.NaN };
    expect(validFlights(bad2)).toBe(false);
  });
});
