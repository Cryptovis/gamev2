import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {fuelGuidance} from '../engine/systems/fuelGuidance';
import {placeIndustrialOrder,processIndustrialContracts} from '../engine/systems/industrialMarket';
import {applyGameCommand} from '../engine/commands';
import {canLoadSave,migrateSave} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';
import {withWarFuel} from './warFixture';
import {startTacticalBattle,ORDER_COST,tacticalRoundFuel,playerSide} from '../engine/systems/tactical';
import {tacticalDraftPreview} from '../engine/systems/tacticalDraft';
import {displayCountry} from '../presentation/countryIdentity';
import {WORLD_COUNTRY_SEEDS} from '../data/worldCountryCatalog';
import {matchesNews,newJournalToasts,enqueueToasts} from '../presentation/newsChannels';
import {UI_CATALOG_SPRINT3} from '../i18n/uiCatalogSprint3';
import {translateText} from '../i18n/localeText';
import geometry from '../../public/data/countries.geojson?raw';
import {findCountryAtGeoPoint} from '../map/mapSelection';
const ready=()=>{const s=makeInitialState();s.countries.TUR.economy.treasury=1000;s.countries.GRC.processedResources.fuel=1000;s.countries.TUR.diplomacy.relations.GRC={score:90,status:'ally',treaties:['trade','alliance'],sanctions:false};return s;};
describe('Sprint 3 fuel guidance and contracts',()=>{
 it('pure guidance distinguishes crude oil, actual refined fuel and readiness without advancing RNG',()=>{
  const s=ready();s.countries.TUR.resources.oil=100000;s.countries.TUR.processedResources.fuel=0;const before=structuredClone(s);
  for(let i=0;i<10;i++){const guide=fuelGuidance(s)!;expect(guide.low).toBe(true);expect(guide.readiness.allowed).toBe(false);}
  expect(s).toEqual(before);
 });
 for(const years of [1,3,5,10] as const)it(`${years}-year fuel contract signs without fuel/cash creation and conserves two settlements`,()=>{
  const initial=ready(),stock=initial.countries.TUR.processedResources.fuel,cash=initial.countries.TUR.economy.treasury;
  const s=placeIndustrialOrder(initial,'GRC','fuel',5,'buy',years),contract=Object.values(s.industrialContracts)[0];
  expect(contract.expiresDay).toBe(s.day+365*years);expect(s.countries.TUR.processedResources.fuel).toBe(stock);expect(s.countries.TUR.economy.treasury).toBe(cash);
  expect(placeIndustrialOrder(s,'GRC','fuel',5,'buy',years)).toBe(s);
  const saved=snapshotGame(s);expect(canLoadSave(saved)).toBe(true);expect(migrateSave(saved)!.industrialContracts).toEqual(s.industrialContracts);
  let current=processIndustrialContracts({...s,day:contract.nextDeliveryDay-1});expect(current.countries.TUR.processedResources.fuel).toBe(stock);
  for(const day of [contract.nextDeliveryDay,contract.nextDeliveryDay+30]){
   const before=current,totalFuel=before.countries.TUR.processedResources.fuel+before.countries.GRC.processedResources.fuel,totalCash=before.countries.TUR.economy.treasury+before.countries.GRC.economy.treasury;
   current=processIndustrialContracts({...current,day});expect(current.countries.TUR.processedResources.fuel-before.countries.TUR.processedResources.fuel).toBe(5);
   expect(current.countries.TUR.processedResources.fuel+current.countries.GRC.processedResources.fuel).toBe(totalFuel);expect(current.countries.TUR.economy.treasury+current.countries.GRC.economy.treasury).toBeCloseTo(totalCash,10);
   expect(before.countries.TUR.economy.treasury-current.countries.TUR.economy.treasury).toBeCloseTo(5*contract.price,10);
  }
  expect(processIndustrialContracts({...current,day:contract.expiresDay+1}).industrialContracts[contract.id].active).toBe(false);
  const cancelled=applyGameCommand(s,{type:'industry/cancelContract',id:contract.id});expect(cancelled.industrialContracts[contract.id].active).toBe(false);
  expect(processIndustrialContracts({...cancelled,day:contract.nextDeliveryDay}).countries.TUR.processedResources.fuel).toBe(stock);
 });
 for(const block of ['stock','liquidity','embargo','war'] as const)it(`${block} prevents settlement from manufacturing fuel or funds`,()=>{
  const s=placeIndustrialOrder(ready(),'GRC','fuel',5,'buy',1),contract=Object.values(s.industrialContracts)[0];
  if(block==='stock')s.countries.GRC.processedResources.fuel=0;if(block==='liquidity')s.countries.TUR.economy.treasury=0;
  if(block==='embargo')s.countries.TUR.diplomacy.relations.GRC.sanctions=true;if(block==='war')s.countries.TUR.diplomacy.relations.GRC.status='war';
  const before=structuredClone(s),after=processIndustrialContracts({...s,day:contract.nextDeliveryDay});
  for(const id of ['TUR','GRC']){expect(after.countries[id].processedResources.fuel).toBe(before.countries[id].processedResources.fuel);expect(after.countries[id].economy.treasury).toBe(before.countries[id].economy.treasury);}
  expect(after.industrialContracts[contract.id].missedDeliveries).toBe(1);
 });
});
it('tactical draft totals include queued replacement, stale validation and engine fuel; no draft mutates the campaign',()=>{
 let s=withWarFuel(makeInitialState());s.world.tutorial.active=false;s=applyGameCommand(s,{type:'military/declareWar',targetCountryId:'GRC'});const id=Object.keys(s.wars)[0];s=startTacticalBattle(s,id);const b=s.wars[id].tactical!,side=playerSide(s,s.wars[id]),units=b.units.filter(u=>u.side===side),before=structuredClone(s);
 const queued=[{unitId:units[0].id,kind:'defend' as const}],candidate={unitId:units[1].id,kind:'reserve' as const};
 const preview=tacticalDraftPreview(s,id,queued,candidate,b.round)!;expect(preview.points).toBe(ORDER_COST.defend+ORDER_COST.reserve);expect(preview.fuel).toBe(tacticalRoundFuel(s,s.wars[id],side,preview.orders));
 expect(tacticalDraftPreview(s,id,queued,{unitId:units[0].id,kind:'reserve'},b.round)!.orders).toHaveLength(1);
 expect(tacticalDraftPreview(s,id,queued,candidate,b.round-1)!.reasons).toContain('These orders belong to an earlier round. Review the current battlefield.');expect(s).toEqual(before);
});
it('Cyprus has one seed and one combined selectable geometry; old-save normalization preserves every simulation field',()=>{
 expect(WORLD_COUNTRY_SEEDS.filter(c=>c.id==='CYP')).toHaveLength(1);
 const s=makeInitialState(),old={...s.countries.CYP,name:'N. Cyprus',iso2:'XX'},before=structuredClone(old),view=displayCountry(old);expect(view.name).toBe('Cyprus');expect(view.iso2).toBe('CY');expect({...view,name:old.name,iso2:old.iso2}).toEqual(old);expect(old).toEqual(before);
 const json=JSON.parse(geometry),cyprus=json.features.filter((f:any)=>f.properties.iso_a3==='CYP');expect(cyprus).toHaveLength(1);expect(cyprus[0].geometry.type).toBe('MultiPolygon');
 for(const point of [[33.2,35.3],[32.7,34.8]] as [number,number][])expect(findCountryAtGeoPoint(cyprus,new Set(['CYP']),point)).toBe('CYP');
});
it('news filters are language-independent; loading history is silent and queues coalesce/bound by stable IDs',()=>{
 expect(matchesNews('WAR // France','wars')).toBe(true);expect(matchesNews('MARKET // Fuel','economy')).toBe(true);expect(matchesNews('DIPLOMACY // Embassy','diplomacy')).toBe(true);expect(matchesNews('Old unclassified message','economy')).toBe(false);expect(matchesNews('Old unclassified message','all')).toBe(true);
 const before=makeInitialState(),after={...before,world:{...before.world,journal:[{id:'new',day:before.day,message:'VICTORY // Cyprus',kind:'world' as const}]}};
 expect(newJournalToasts(before,after,true)).toEqual([]);const events=newJournalToasts(before,after);expect(events).toHaveLength(1);expect(enqueueToasts(events,events)).toHaveLength(1);
 const burst=Array.from({length:20},(_,i)=>({...events[0],id:String(i),day:i,priority:i===3?3:1}));expect(enqueueToasts([],burst)).toHaveLength(8);expect(enqueueToasts([],burst)[0].priority).toBe(3);
 const queue=enqueueToasts([],events);expect(after.world.journal).toHaveLength(1);expect(queue[0].id).toBe('new');
});
it('all new Sprint 3 copy has five-language coverage',()=>{for(const [key,values] of Object.entries(UI_CATALOG_SPRINT3)){expect(translateText('en',key)).toBe(key);for(const [index,lang] of ['tr','es','zh','ru'].entries())expect(translateText(lang,key)).toBe(values[index]);}});
