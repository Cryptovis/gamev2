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

describe('audit follow-up: tactical availability short-circuit',()=>{
 it('retains role, fuel and stale-round blockers while finding any valid sector',async()=>{
  const {withWarFuel}=await import('./warFixture');
  const {applyGameCommand}=await import('../engine/commands');
  const {startTacticalBattle,playerSide}=await import('../engine/systems/tactical');
  const {tacticalDraftPreview}=await import('../engine/systems/tacticalDraft');
  let s=withWarFuel(makeInitialState());s.world.tutorial.active=false;
  s=applyGameCommand(s,{type:'military/declareWar',targetCountryId:'GRC'});
  const id=Object.keys(s.wars)[0];s=startTacticalBattle(s,id);
  const b=s.wars[id].tactical!,side=playerSide(s,s.wars[id]);
  const infantry=b.units.find(u=>u.side===side&&u.role==='infantry')!;
  const candidate={unitId:infantry.id,kind:'defend' as const};
  const preview=tacticalDraftPreview(s,id,[],candidate,b.round)!;
  expect(preview.actions.defend.allowed).toBe(true);expect(preview.actions.recon.allowed).toBe(true);
  expect(preview.actions.bombard.allowed).toBe(false);expect(preview.actions.bombard.reason).toContain('Artillery');
  s.countries[s.playerCountryId].processedResources.fuel=0;
  const dry=tacticalDraftPreview(s,id,[],candidate,b.round)!;
  expect(dry.actions.defend.allowed).toBe(true);expect(dry.actions.move.allowed).toBe(false);
  expect(dry.actions.move.reason).toContain('Not enough fuel');
  const stale=tacticalDraftPreview(s,id,[],candidate,b.round-1)!;
  for(const action of Object.values(stale.actions)){expect(action.allowed).toBe(false);expect(action.reason).toContain('earlier round');}
 });
});
