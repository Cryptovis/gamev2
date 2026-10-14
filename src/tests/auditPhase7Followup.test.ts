import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {AutosaveCoordinator} from '../persistence/autosaveCoordinator';
import {fuelGuidance} from '../engine/systems/fuelGuidance';
import {simulateResources} from '../engine/systems/resources';
import {createEnergy} from '../engine/systems/energy';
import {newsChannel,matchesNews,alertNewsChannel} from '../presentation/newsChannels';

describe('audit follow-up: same-day autosave refresh',()=>{
 it('persists commands made after the same-day checkpoint',async()=>{
  const coordinator=new AutosaveCoordinator();let stored='before order';
  await coordinator.save('campaign:5',async()=>{stored='before order';});
  await coordinator.saveLatest('campaign:5',async()=>{stored='after order';});
  expect(stored).toBe('after order');
 });
 it('queues a fresh snapshot behind an older in-flight write',async()=>{
  const coordinator=new AutosaveCoordinator();let release!:()=>void,stored=0;
  const old=coordinator.save('campaign:5',async()=>{await new Promise<void>(r=>release=r);stored=1;});
  await Promise.resolve();
  const latest=coordinator.saveLatest('campaign:5',async()=>{stored=2;});
  expect(stored).toBe(0);release();
  expect(await old).toBe(true);expect(await latest).toBe(true);expect(stored).toBe(2);
 });
 it('a failed write does not block later snapshots or another campaign',async()=>{
  const coordinator=new AutosaveCoordinator();const saved:string[]=[];
  expect(await coordinator.saveLatest('A:5',async()=>{throw Error('disk');})).toBe(false);
  await coordinator.saveLatest('A:5',async()=>{saved.push('A');});
  await coordinator.saveLatest('B:5',async()=>{saved.push('B');});
  expect(saved).toEqual(['A','B']);
 });
});

describe('audit follow-up: domestic crude consumption',()=>{
 const fixture=()=>{
  const s=makeInitialState(),p=s.countries[s.playerCountryId];
  p.resources.oil=100;p.industry.utilization=100;p.industry.refineries=10;
  p.resourceProduction.oil=simulateResources(p).consumption.oil+.1;
  const e=createEnergy(p);for(const k of Object.keys(e.plants) as Array<keyof typeof e.plants>)e.plants[k]=0;
  e.projects=[];s.world.energy={[p.id]:e};return s;
 };
 it('warns when a raw oil surplus is outweighed by refinery consumption',()=>{
  const s=fixture(),before=structuredClone(s),guide=fuelGuidance(s)!;
  expect(simulateResources(s.countries[s.playerCountryId]).net.oil).toBeCloseTo(.1);
  expect(guide.oilNet).toBeCloseTo(-.45);expect(guide.oilDeclining).toBe(true);
  expect(s).toEqual(before);
 });
 it('accounts for oil power plants while excluding disabled plants',()=>{
  const s=fixture(),id=s.playerCountryId;s.countries[id].industry.refineries=0;
  const e=s.world.energy![id];e.plants.oil=20;
  expect(fuelGuidance(s)!.oilDeclining).toBe(true);
  e.enabled.oil=false;expect(fuelGuidance(s)!.oilNet).toBeCloseTo(.1);
 });
});

describe('audit follow-up: actual engine news prefixes and alert destinations',()=>{
 it.each([['DIPLOMATIC OFFER','diplomacy'],['PEACE','wars'],['EXCHANGE','trade'],['INVESTMENT','economy'],['INFRASTRUCTURE','economy']] as const)('%s appears in %s', (prefix,channel)=>{
  const message=`${prefix} // report`;expect(newsChannel(message)).toBe(channel);expect(matchesNews(message,channel)).toBe(true);
 });
 it('includes exchange reports in Economy and keeps unknown reports in All only',()=>{
  expect(matchesNews('EXCHANGE // Gold','economy')).toBe(true);
  expect(matchesNews('Legacy report','all')).toBe(true);expect(matchesNews('Legacy report','wars')).toBe(false);
 });
 it('routes military alerts to Wars, sanctions to Diplomacy and domestic alerts to All',()=>{
  expect(alertNewsChannel({category:'security',panel:'military'})).toBe('wars');
  expect(alertNewsChannel({category:'security',panel:'diplomacy-inbox'})).toBe('diplomacy');
  expect(alertNewsChannel({category:'resources',panel:'fuel-help'})).toBe('economy');
  expect(alertNewsChannel({category:'domestic',panel:'society'})).toBe('all');
 });
});
