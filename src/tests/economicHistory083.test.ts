import { describe,it,expect } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { recordEconomicHistory } from '../engine/systems/economicHistory';
import { tickGame } from '../engine/tick';
import { snapshotGame } from '../persistence/snapshot';
import { migrateSave } from '../persistence/migrations';
describe('0.83 retained economic history',()=>{
 it('migrates schema 15 without inventing earlier observations',()=>{const s=makeInitialState();s.schemaVersion=15;s.day=80;delete s.world.economicHistory;const n=migrateSave(s)!;expect(n.schemaVersion).toBe(17);expect(n.world.economicHistory!.points).toHaveLength(1);expect(n.world.economicHistory!.points[0].day).toBe(80);});
 it('records the actual daily result and net treasury movement',()=>{let s=makeInitialState();s.world.tutorial.active=false;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;const n=tickGame(s),p=n.world.economicHistory!.points.at(-1)!;expect(p.day).toBe(2);expect(p.gdp).toBe(n.countries.TUR.economy.gdp);expect(p.treasuryChange).toBeCloseTo(n.countries.TUR.economy.treasury-s.countries.TUR.economy.treasury);});
 it('replaces same-day samples, bounds history and preserves it across saves',()=>{let s=makeInitialState();for(let day=2;day<=250;day++)s=recordEconomicHistory({...s,day});s=recordEconomicHistory(s);expect(s.world.economicHistory!.points).toHaveLength(180);expect(s.world.economicHistory!.points[0].day).toBe(71);expect(migrateSave(snapshotGame(s))!.world.economicHistory).toEqual(s.world.economicHistory);});
 it('rejects nonfinite, unordered and future history',()=>{for(const bad of ['finite','order','future']){const s=recordEconomicHistory({...makeInitialState(),day:2});if(bad==='finite')s.world.economicHistory!.points[0].gdp=NaN;else if(bad==='order')s.world.economicHistory!.points.reverse();else s.world.economicHistory!.points[1].day=3;expect(migrateSave(s)).toBeNull();}});
});
