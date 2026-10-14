import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import {LEADER_ARCHETYPES,LEADER_PERKS,portraitArchetype} from '../data/leaderArchetypes';
import {initializeLeaderArchetype} from '../engine/systems/leadership';
import {leaderModifiers,NEUTRAL_LEADER} from '../engine/systems/leaderPerks';
import {simulateResources} from '../engine/systems/resources';
import {simulateEconomy} from '../engine/systems/economy';
import {simulatePolitics} from '../engine/systems/politics';
import {processProduction} from '../engine/systems/production';
import {processIndustry} from '../engine/systems/industry';
import {processIndustrialEconomy} from '../engine/systems/industrialEconomy';
import {industrialDailyUse} from '../engine/systems/industrialMarket';
import {agreementCost} from '../engine/systems/treaties';
import {recruitmentPreview,recruitPersonnel} from '../engine/systems/livingEconomy';
import {pilotTrainingPreview} from '../engine/systems/governance';
import {combatPreview,openWar} from '../engine/systems/warRules';
import {resolveCombatRound} from '../engine/systems/warfare';
import {withWarFuel} from './warFixture';
import {tickCountry,tickGame} from '../engine/tick';
import {useGameStore} from '../store/gameStore';
import {snapshotGame} from '../persistence/snapshot';
import {canLoadSave,migrateSave} from '../persistence/migrations';
import {UI_CATALOG_094} from '../i18n/uiCatalog094';
import {translateText} from '../i18n/localeText';

const ready=()=>{const s=makeInitialState(),p=s.countries[s.playerCountryId];p.economy.treasury=10000;p.resources.food=1000;p.resources.oil=1000;p.resources.iron=1000;p.processedResources={fuel:1000,steel:1000,electricity:1000};return s;};
describe('0.94 release and leader state',()=>{
 it('retains schema 17 at official version 0.98.1',()=>{expect(version).toBe('0.98.1');expect(makeInitialState().schemaVersion).toBe(17);});
 it.each([['avatar-01','executive'],['avatar-02','reformer'],['avatar-03','diplomat'],['avatar-04','governor'],['avatar-05','chancellor'],['avatar-06','commander']] as const)('%s initializes %s in the campaign engine',(avatar,role)=>{
  const seed=makeInitialState().simulationSeed;
  useGameStore.getState().startCampaign({commanderName:'Release test',countryId:'TUR',avatarId:avatar,language:'en'});
  const s=useGameStore.getState();expect(portraitArchetype(avatar)).toBe(role);expect(s.leadership.archetype).toBe(role);expect(s.simulationSeed).toBe(seed);
  const before=structuredClone(s.leadership),treasury=s.countries.TUR.economy.treasury;
  useGameStore.getState().setPlayerAvatar('avatar-02');expect(useGameStore.getState().leadership).toEqual(before);expect(useGameStore.getState().countries.TUR.economy.treasury).toBe(treasury);
 });
 it('round-trips optional metadata and never grants old saves or AI countries a perk',()=>{
  const old=ready();expect(leaderModifiers(old)).toBe(NEUTRAL_LEADER);expect(migrateSave(snapshotGame(old))!.leadership.archetype).toBeUndefined();
  for(const role of LEADER_ARCHETYPES){const s=initializeLeaderArchetype(old,role);expect(migrateSave(snapshotGame(s))!.leadership.archetype).toBe(role);expect(leaderModifiers(s,'GRC')).toBe(NEUTRAL_LEADER);expect(initializeLeaderArchetype(s,role)).toBe(s);}
  const bad=snapshotGame(old);Object.assign(bad.leadership,{archetype:'unknown'});expect(canLoadSave(bad)).toBe(false);
 });
 it('translates every displayed perk in all five languages',()=>{
  for(const perk of Object.values(LEADER_PERKS))for(const text of [perk.title,perk.description])for(const lang of ['en','tr','es','zh','ru'])expect(translateText(lang,text)).toBe(lang==='en'?text:UI_CATALOG_094[text][['tr','es','zh','ru'].indexOf(lang)]);
  for(const [key,values] of Object.entries(UI_CATALOG_094))for(const [i,lang] of ['tr','es','zh','ru'].entries())expect(translateText(lang,key)).toBe(values[i]);
 });
});
describe('0.94 deterministic active engine perks',()=>{
 it('Executive increases actual factory output and daily tax revenue, not AI output',()=>{
  const s=ready(),perk=initializeLeaderArchetype(s,'executive'),p=s.countries.TUR,mods=leaderModifiers(perk);
  const base=simulateEconomy(p,simulateResources(p)),boosted=simulateEconomy(p,simulateResources(p),mods);
  expect(boosted.taxRevenue).toBeCloseTo(base.taxRevenue*1.05);expect(boosted.debtService).toBe(base.debtService);
  const a=processProduction(s),b=processProduction(perk);expect(b.production.TUR.lastDailyOutput.infantry_equipment).toBeCloseTo(a.production.TUR.lastDailyOutput.infantry_equipment*1.1);expect(b.production.GRC).toEqual(a.production.GRC);
  expect(processIndustry(p,1,true,mods.factory).processedResources.steel-p.processedResources.steel).toBeCloseTo((processIndustry(p,1,true).processedResources.steel-p.processedResources.steel)*1.1);
 });
 it('Reformer boosts starting approval once and positive stability recovery only',()=>{
  const s=ready(),p=s.countries.TUR,perk=initializeLeaderArchetype(s,'reformer');expect(perk.countries.TUR.politics.approval).toBeCloseTo(Math.min(100,p.politics.approval*1.08));
  p.politics.stability=10;const resources=simulateResources(p),economy=simulateEconomy(p,resources),a=simulatePolitics(p,economy,resources),b=simulatePolitics(p,economy,resources,1.1);expect(b.stability-p.politics.stability).toBeCloseTo((a.stability-p.politics.stability)*1.1);
  p.politics.stability=100;expect(simulatePolitics(p,economy,resources,1.1).stability).toBe(simulatePolitics(p,economy,resources).stability);
 });
 it('Diplomat raises bilateral opening scores and discounts only its own embassy fee',()=>{
  const s=ready(),perk=initializeLeaderArchetype(s,'diplomat');
  for(const id of Object.keys(s.countries).filter(id=>id!=='TUR'))expect(perk.countries.TUR.diplomacy.relations[id].score).toBe(Math.min(100,(s.countries.TUR.diplomacy.relations[id]?.score??0)+15));
  expect(agreementCost(perk,'TUR','embassy')).toBeCloseTo(agreementCost(s,'TUR','embassy')*.8);expect(agreementCost(perk,'GRC','embassy')).toBe(agreementCost(s,'GRC','embassy'));expect(agreementCost(perk,'TUR','trade')).toBe(agreementCost(s,'TUR','trade'));
 });
 it('Commander recruitment previews match transfers, costs and population conservation',()=>{
  const s=initializeLeaderArchetype(ready(),'commander'),quote=recruitmentPreview(s,10000),n=recruitPersonnel(s,10000);
  expect(quote.count).toBe(11000);expect(n.countries.TUR.military.personnel-s.countries.TUR.military.personnel).toBe(quote.count);expect(s.countries.TUR.economy.treasury-n.countries.TUR.economy.treasury).toBeCloseTo(quote.cost);expect(n.countries.TUR.demographics.population).toBe(s.countries.TUR.demographics.population);expect(pilotTrainingPreview(s,10).days).toBeLessThan(pilotTrainingPreview(ready(),10).days);
  expect(recruitPersonnel({...s,countries:{...s.countries,TUR:{...s.countries.TUR,economy:{...s.countries.TUR.economy,treasury:0}}}},10000).countries.TUR.military.personnel).toBe(s.countries.TUR.military.personnel);
 });
 it('Commander defensive power appears once in previews and seeded combat, without an offensive bonus',()=>{
  let s=withWarFuel(ready(),'GRC');const perk=initializeLeaderArchetype(s,'commander');
  expect(combatPreview(perk,'GRC','TUR').powerRatio).toBeCloseTo(combatPreview(s,'GRC','TUR').powerRatio/1.15);expect(combatPreview(perk,'TUR','GRC').powerRatio).toBe(combatPreview(s,'TUR','GRC').powerRatio);
  const opened=openWar(s,'GRC','TUR');expect(opened.warId).not.toBeNull();s=opened.state;
  const a=resolveCombatRound(s,opened.warId!),b=resolveCombatRound(initializeLeaderArchetype(s,'commander'),opened.warId!);
  expect(b.wars[opened.warId!].defenderLosses.personnel).toBeLessThan(a.wars[opened.warId!].defenderLosses.personnel);expect(b.simulationSeed).toBe(a.simulationSeed);
 });
 it('Chancellor adds opening treasury once and lowers ongoing debt interest',()=>{
  const s=ready(),perk=initializeLeaderArchetype(s,'chancellor'),p=s.countries.TUR;expect(perk.countries.TUR.economy.treasury).toBe(p.economy.treasury*1.2);
  expect(simulateEconomy(p,simulateResources(p),leaderModifiers(perk)).debtService).toBeCloseTo(simulateEconomy(p,simulateResources(p)).debtService*.85);
 });
 it('Governor lowers actual daily food and consumer water consumption',()=>{
  const s=ready(),perk=initializeLeaderArchetype(s,'governor'),p=s.countries.TUR;
  expect(simulateResources(p,1,undefined,leaderModifiers(perk).consumer).consumption.food).toBeCloseTo(simulateResources(p).consumption.food*.85);
  const a=tickCountry(p,1,true),b=tickCountry(p,1,true,undefined,leaderModifiers(perk));expect(b.resources.food).toBeGreaterThan(a.resources.food);
  const n=s.industrialEconomy.TUR;for(const k of Object.keys(n.enabled) as Array<keyof typeof n.enabled>)n.enabled[k]=false;
  const before=n.stock.water,aWater=processIndustrialEconomy(s).industrialEconomy.TUR.stock.water,bWater=processIndustrialEconomy({...perk,industrialEconomy:s.industrialEconomy}).industrialEconomy.TUR.stock.water;
  expect(before-bWater).toBeCloseTo((before-aWater)*.85);expect(industrialDailyUse(perk,'TUR','water')).toBeCloseTo(industrialDailyUse(s,'TUR','water')*.85);
 });
 it.each(LEADER_ARCHETYPES)('%s evolves deterministically without changing its input or save schema',role=>{
  let initial=initializeLeaderArchetype(ready(),role);initial.world.tutorial.active=false;const before=structuredClone(initial);let a=initial,b=structuredClone(initial);
  for(let i=0;i<10;i++){a=tickGame(a);b=tickGame(b);}expect(a).toEqual(b);expect(initial).toEqual(before);expect(a.schemaVersion).toBe(17);expect(canLoadSave(snapshotGame(a))).toBe(true);
 });
});
