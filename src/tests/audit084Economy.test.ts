import { describe, expect, it } from 'vitest';
import { makeInitialState } from '../data/initialState';
import { FACILITIES, GOODS } from '../data/industrialCatalog';
import type { GameState } from '../domain/game';
import type { FacilityKind, IndustrialGood, NationalIndustrialEconomy } from '../domain/industrial';
import { tickGame } from '../engine/tick';
import { simulateEconomy } from '../engine/systems/economy';
import { occupationFor } from '../engine/systems/governance';
import { changeGoodStock, facilityUpkeepScale, goodStock, processIndustrialEconomy } from '../engine/systems/industrialEconomy';
import { infrastructureMaintenance, processInfrastructure } from '../engine/systems/infrastructure';
import { EXCHANGE_GOODS, exchangePrice, exchangeStock, exportableStock, living, processExchange, withLiving } from '../engine/systems/livingEconomy';
import { processNationalProduction } from '../engine/systems/production';
import { foodReserveDays, oilReserveDays, reserveDays, simulateResources, SHORTAGE_RESERVE_DAYS, SURPLUS_RESERVE_DAYS } from '../engine/systems/resources';
import { acceptCredit, expansion, postCredit, processCredit } from '../engine/systems/sovereignCredit';

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const unblock = (s: GameState): GameState => ({ ...s, activeEvent: null, activeAdvisor: null, world: { ...s.world, tutorial: { ...s.world.tutorial, active: false }, living: s.world.living ? { ...s.world.living, advice: { ...s.world.living.advice, active: null }, notice: undefined } : s.world.living } });

// Pre-0.84 algorithm (re-copies the country maps after every facility step), kept as the reference for the C8 rewrite.
// Upkeep uses the same facilityUpkeepScale as the engine so only the draft/write-back change is compared.
function legacyProcessIndustrialEconomy(state: GameState): GameState {
 let next=state;
 for(const id of Object.keys(state.countries)){
 if(state.countries[id].annexedBy)continue;
  let c=next.countries[id];let n={...next.industrialEconomy[id],stock:{...next.industrialEconomy[id].stock},facilities:{...next.industrialEconomy[id].facilities},deposits:{...next.industrialEconomy[id].deposits},lastOutput:{},bottlenecks:{},lastCosts:0} as NationalIndustrialEconomy;
  for(const p of n.projects.filter(p=>p.readyDay<=state.day)){
   n.facilities[p.kind]++;
   if(p.kind==='civil_factory')c={...c,industry:{...c.industry,factories:c.industry.factories+5,refineries:c.industry.refineries+1}};
  }
  n.projects=n.projects.filter(p=>p.readyDay>state.day);
  next={...next,countries:{...next.countries,[id]:c},industrialEconomy:{...next.industrialEconomy,[id]:n}};
  const boost=(id===state.playerCountryId&&state.day<state.leadership.celebrationUntilDay?1.12:1)*((occupationFor(state,id)?.unrest??0)>=80?.7:1);
  for(const [kind,d] of Object.entries(FACILITIES) as Array<[FacilityKind,typeof FACILITIES[FacilityKind]]>){
   const count=n.facilities[kind];if(!count||!n.enabled[kind])continue;
   const potential=d.deposit?n.potential[d.deposit]:d.output==='water'?n.potential.water:d.output==='rubber'?n.potential.rubber:1;
   const output=d.yield*count*potential*(c.industry.utilization/100)*boost;
   const upkeep=d.upkeep*count*facilityUpkeepScale(c);
   let ratio=1,reason='';
   const constrain=(available:number,needed:number,label:string)=>{if(needed>0&&available/needed<ratio){ratio=clamp(available/needed,0,1);reason=label;}};
   constrain(Math.max(0,c.economy.treasury),upkeep,'treasury');constrain(c.processedResources.electricity,d.power*count,'electricity');
   for(const [good,amount] of Object.entries(d.inputs))constrain(goodStock(next,id,good as IndustrialGood),(amount??0)*output,GOODS[good as IndustrialGood].label);
   if(d.deposit)constrain(n.deposits[d.deposit],output,'deposit depleted');
   const actual=output*ratio;
   c={...c,economy:{...c.economy,treasury:c.economy.treasury-upkeep*ratio},processedResources:{...c.processedResources,electricity:Math.max(0,c.processedResources.electricity-d.power*count*ratio)}};
   next={...next,countries:{...next.countries,[id]:c}};
   for(const [good,amount] of Object.entries(d.inputs))next=changeGoodStock(next,id,good as IndustrialGood,-(amount??0)*actual);
   if(d.output)next=changeGoodStock(next,id,d.output,actual);
   c=next.countries[id];n=next.industrialEconomy[id];n={...n,lastCosts:n.lastCosts+upkeep*ratio,lastOutput:{...n.lastOutput,...(d.output?{[d.output]:(n.lastOutput[d.output]??0)+actual}:{})},bottlenecks:{...n.bottlenecks,[kind]:ratio<.999?reason:'operational'},deposits:{...n.deposits,...(d.deposit?{[d.deposit]:Math.max(0,n.deposits[d.deposit]-actual)}:{})}};
   next={...next,industrialEconomy:{...next.industrialEconomy,[id]:n}};
  }
  next=changeGoodStock(next,id,'water',-Math.max(.1,c.demographics.population/1e6*.04));
 }
 return next;
}

describe('0.84 economy audit fixes', () => {
  it('C1: measures shortages in days of net deficit, not an absolute stock', () => {
    expect(reserveDays(100, 1, 11)).toBe(10);
    expect(reserveDays(0, 2, 1)).toBe(SURPLUS_RESERVE_DAYS);
    expect(reserveDays(-5, 0, 1)).toBe(0);
    const s = makeInitialState(), c = s.countries.DEU;
    const flow = simulateResources(c);
    const deficit = flow.consumption.oil - flow.production.oil;
    expect(deficit).toBeGreaterThan(0);
    expect(oilReserveDays(c)).toBeCloseTo(c.resources.oil / deficit, 8);
    // A large stock is not a shortage, even if it is below the old absolute threshold of 10 units for a tiny consumer.
    const big = { ...c, resources: { ...c.resources, oil: deficit * 30 } };
    expect(simulateResources(big).oilShortage).toBe(false);
    const low = { ...c, resources: { ...c.resources, oil: deficit * 5 } };
    const lowFlow = simulateResources(low);
    expect(lowFlow.oilShortage).toBe(true);
    expect(lowFlow.oilSeverity).toBeGreaterThan(0);
    expect(lowFlow.oilSeverity).toBeLessThanOrEqual(1);
    expect(simulateResources({ ...c, resources: { ...c.resources, oil: 0 } }).oilSeverity).toBe(1);
    // A producer with a structural surplus is never short, whatever its stock.
    const sau = { ...s.countries.SAU, resources: { ...s.countries.SAU.resources, oil: 0 } };
    expect(oilReserveDays(sau)).toBe(SURPLUS_RESERVE_DAYS);
    expect(simulateResources(sau).oilShortage).toBe(false);
  });

  it('C1: world oil consumption no longer outruns production', () => {
    const s = makeInitialState();
    let production = 0, consumption = 0;
    for (const c of Object.values(s.countries)) { const f = simulateResources(c); production += f.production.oil; consumption += f.consumption.oil; }
    expect(consumption).toBeLessThan(production);
    expect(consumption).toBeGreaterThan(production * 0.2);
  });

  it('C2: the ten most populous countries start with at least a year of food reserve (mild importers, never starving)', () => {
    const s = makeInitialState();
    const top = Object.values(s.countries).sort((a, b) => b.demographics.population - a.demographics.population).slice(0, 10);
    for (const c of top) {
      const f = simulateResources(c);
      // The per-capita floor keeps output within ~10% of consumption, so food remains a tradeable need.
      expect(f.production.food).toBeGreaterThan(f.consumption.food * 0.85);
      expect(foodReserveDays(c)).toBeGreaterThanOrEqual(365);
    }
  });

  it('C3: infrastructure upkeep scales with GDP', () => {
    const s = makeInitialState();
    const levels = { roads: 60, rail: 60, hubs: 60, ports: 60 };
    const small = infrastructureMaintenance(s.countries.LUX, levels), large = infrastructureMaintenance(s.countries.USA, levels);
    expect(large / small).toBeCloseTo(s.countries.USA.economy.gdp / s.countries.LUX.economy.gdp, 6);
    // Big economies still pay meaningful upkeep; micro-states pay less than their daily fiscal surplus.
    expect(large).toBeGreaterThan(0.1);
    const lux = s.countries.LUX, surplus = simulateEconomy(lux, simulateResources(lux)).dailyBalance;
    expect(s.infrastructure.LUX.maintenance).toBeLessThan(surplus);
    const next = processInfrastructure(s);
    expect(next.countries.USA.economy.treasury).toBeCloseTo(s.countries.USA.economy.treasury - next.infrastructure.USA.maintenance, 8);
  });

  it('C5: defaults seize industrial goods first and leave the food and oil subsistence reserve', () => {
    let s = makeInitialState();
    s.countries.TUR.economy.treasury = 10;
    s = postCredit(s, 'lend', 1, 3, 365);
    s = acceptCredit(s, expansion(s).creditOffers[0].id, 'FRA');
    const loan = expansion(s).loans[0];
    const fra = s.countries.FRA;
    fra.economy.treasury = 0;
    const lv = living(s);
    s = withLiving(s, { ...lv, bankGold: { ...lv.bankGold, FRA: { ...lv.bankGold.FRA, tonnes: 0 } } });
    s.industrialEconomy.FRA.stock = { ...s.industrialEconomy.FRA.stock, gold: 0, silver: 0, coal: 1e6 };
    const food = fra.resources.food, oil = fra.resources.oil;
    const n = processCredit({ ...s, day: loan.dueDay }, false);
    expect(expansion(n).loans[0].status).toBe('paid');
    expect(n.countries.FRA.resources.food).toBe(food);
    expect(n.countries.FRA.resources.oil).toBe(oil);
    expect(exchangeStock(n, 'FRA', 'coal')).toBeLessThan(1e6);
  });

  it('C5: food and oil are only seized above the exportable reserve', () => {
    let s = makeInitialState();
    s.countries.TUR.economy.treasury = 10;
    s = postCredit(s, 'lend', 5, 3, 365);
    s = acceptCredit(s, expansion(s).creditOffers[0].id, 'FRA');
    const loan = expansion(s).loans[0];
    s.countries.FRA.economy.treasury = 0;
    s.countries.FRA.processedResources = { fuel: 0, steel: 0, electricity: 0 };
    s.countries.FRA.resources = { ...s.countries.FRA.resources, iron: 0, uranium: 0 };
    s.production.FRA.stockpile.armor = 0;
    s.industrialEconomy.FRA.stock = Object.fromEntries(Object.keys(s.industrialEconomy.FRA.stock).map(k => [k, 0])) as typeof s.industrialEconomy.FRA.stock;
    const lv = living(s);
    s = withLiving(s, { ...lv, bankGold: { ...lv.bankGold, FRA: { ...lv.bankGold.FRA, tonnes: 0 } } });
    const reserveFood = s.countries.FRA.resources.food - exportableStock(s, 'FRA', 'food');
    const reserveOil = s.countries.FRA.resources.oil - exportableStock(s, 'FRA', 'oil');
    const n = processCredit({ ...s, day: loan.dueDay }, false);
    expect(n.countries.FRA.resources.food).toBeGreaterThanOrEqual(reserveFood - 1e-9);
    expect(n.countries.FRA.resources.oil).toBeGreaterThanOrEqual(reserveOil - 1e-9);
  });

  it('C5/#6: a creditor without a gold vault entry receives gold without NaN', () => {
    let s = makeInitialState();
    s.countries.TUR.economy.treasury = 10;
    s = postCredit(s, 'lend', 1, 3, 365);
    s = acceptCredit(s, expansion(s).creditOffers[0].id, 'FRA');
    const loan = expansion(s).loans[0];
    s.countries.FRA.economy.treasury = 0;
    const lv = living(s);
    const { TUR: _drop, ...vaults } = lv.bankGold;
    s = withLiving(s, { ...lv, bankGold: { ...vaults, FRA: { ...lv.bankGold.FRA, tonnes: 50 } } });
    const n = processCredit({ ...s, day: loan.dueDay }, false);
    expect(Number.isFinite(living(n).bankGold.TUR.tonnes)).toBe(true);
    expect(living(n).bankGold.TUR.tonnes).toBeGreaterThan(0);
  });

  it('C8: per-country draft produces exactly the legacy result and stays deterministic', () => {
    let s = makeInitialState();
    for (let day = 0; day < 40; day++) {
      if (day % 8 === 0) {
        const legacy = legacyProcessIndustrialEconomy(s), current = processIndustrialEconomy(s);
        expect(current.countries).toEqual(legacy.countries);
        expect(current.industrialEconomy).toEqual(legacy.industrialEconomy);
        expect(current.production).toEqual(legacy.production);
        expect(processIndustrialEconomy(s).industrialEconomy).toEqual(current.industrialEconomy);
      }
      s = tickGame(unblock(s));
    }
    // Completed projects are applied once, including the civil-factory industry bonus.
    const id = 'DEU', before = s.countries[id].industry;
    s.industrialEconomy[id] = { ...s.industrialEconomy[id], projects: [{ id: 'p', kind: 'civil_factory', readyDay: s.day }] };
    const legacy = legacyProcessIndustrialEconomy(s), current = processIndustrialEconomy(s);
    expect(current.countries).toEqual(legacy.countries);
    expect(current.industrialEconomy).toEqual(legacy.industrialEconomy);
    expect(current.countries[id].industry.factories).toBe(before.factories + 5);
    expect(s.countries[id].industry.factories).toBe(before.factories);
  });

  it('C8/C3: facility upkeep scales down for small economies only', () => {
    const s = makeInitialState();
    expect(facilityUpkeepScale(s.countries.USA)).toBe(1);
    expect(facilityUpkeepScale(s.countries.LUX)).toBeLessThan(0.1);
    expect(facilityUpkeepScale({ ...s.countries.LUX, economy: { ...s.countries.LUX.economy, gdp: 0 } })).toBe(0.02);
  });

  it('C9: listing and buying leave reference prices unchanged, so pricing once per call is exact', () => {
    let s = makeInitialState();
    for (let i = 0; i < 14; i++) s = tickGame(unblock(s));
    s = { ...s, day: 21 };
    const before = Object.fromEntries(EXCHANGE_GOODS.map(g => [g, exchangePrice(s, g)]));
    const n = processExchange(s);
    expect(living(n).listings.length).toBeGreaterThan(0);
    for (const g of EXCHANGE_GOODS) expect(exchangePrice(n, g)).toBeCloseTo(before[g], 12);
    expect(processExchange(s)).toEqual(n);
  });

  it('C13: idle production lines do not gain efficiency', () => {
    const s = makeInitialState(), c = s.countries.TUR;
    const p = s.production.TUR;
    const lines = Object.fromEntries(Object.entries(p.lines).map(([k, l]) => [k, { ...l, factories: 0, efficiency: 40 }])) as typeof p.lines;
    const rich = { ...c, processedResources: { fuel: 500, steel: 500, electricity: 500 }, economy: { ...c.economy, treasury: 500 } };
    const idle = processNationalProduction(rich, { ...p, lines });
    for (const l of Object.values(idle.production.lines)) expect(l.efficiency).toBe(40);
    const busy = processNationalProduction(rich, { ...p, lines: { ...lines, infantry_equipment: { ...lines.infantry_equipment, factories: 1 } } });
    expect(busy.production.lines.infantry_equipment.efficiency).toBeCloseTo(40.3);
  });

  it('#24: a full electricity store is not treated as a shortage for very large industries', () => {
    const s = makeInitialState(), c = s.countries.CHN;
    const huge = { ...c, industry: { ...c.industry, factories: 2000 }, processedResources: { ...c.processedResources, electricity: 1500 } };
    const empty = { ...huge, processedResources: { ...huge.processedResources, electricity: 0 } };
    const r = simulateResources(huge);
    expect(simulateEconomy(huge, r).dailyGrowthRate).toBeGreaterThan(simulateEconomy(empty, r).dailyGrowthRate);
  });
});
