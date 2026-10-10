import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {nextLeadershipQuote,LEADERSHIP_QUOTES} from '../data/leadershipQuotes';
import {affairsPreview} from '../engine/affairsPreview';
import {executeCommandResult,applyGameCommand} from '../engine/commands';
import {proposeCouncilResolution} from '../engine/systems/council';
import {simulatePolitics} from '../engine/systems/politics';
import {processAutoWars,resolveCombatRound} from '../engine/systems/warfare';
import {settleWarOutcome} from '../engine/systems/warOutcome';
import {relationFor} from '../engine/systems/diplomacy';
import {withWarFuel} from './warFixture';
import {UI_CATALOG_090} from '../i18n/uiCatalog090';
import {translateText} from '../i18n/localeText';

describe('0.90 clear command',()=>{
 it('fresh quote excludes the previous quote even with identical randomness',()=>{
  for(const q of LEADERSHIP_QUOTES)for(const roll of [0,.25,.5,.99,1,NaN,-1])expect(nextLeadershipQuote(roll,q.id).id).not.toBe(q.id);
 });
 it('foreign territory preparation reports ownership rather than a misleading budget message',()=>{
  const s=makeInitialState(),command={type:'integration/prepare',id:'GRC',kind:'language'} as const;
  s.countries.TUR.economy.treasury=1000;
  expect(affairsPreview(s,command)?.reasons).toContain('You must control this territory first.');
  const result=executeCommandResult(s,command);expect(result.status).toBe('unavailable');expect(result.message).toBe('You must control this territory first.');expect(result.state).toBe(s);
 });
 it('controlled preparation is charged once and shows its seven-day cooldown',()=>{
  let s=makeInitialState();s.countries.GRC.controllerCountryId='TUR';
  const command={type:'integration/prepare',id:'GRC',kind:'language',commandId:'prepare-once'} as const;
  const before=s.countries.TUR.economy.treasury;expect(affairsPreview(s,command)?.allowed).toBe(true);
  s=executeCommandResult(s,command).state;expect(s.countries.TUR.economy.treasury).toBeCloseTo(before-.25);
  expect(executeCommandResult(s,command).status).toBe('duplicate');expect(affairsPreview(s,command)?.cooldown).toBe(7);
 });
 it('campaign preview exposes all thresholds and allows either military weakness or ideological pressure',()=>{
  const s=makeInitialState(),c=s.countries.GRC,command={type:'politics/campaign',id:'GRC'} as const;
  s.countries.TUR.economy.treasury=1000;c.politics.approval=40;c.politics.stability=50;c.military.readiness=80;c.military.logistics=80;c.society.influencePressure.ideology=0;
  expect(affairsPreview(s,command)?.reasons).toHaveLength(3);
  c.politics.approval=39;c.politics.stability=49;c.society.influencePressure.ideology=30;
  expect(affairsPreview(s,command)?.allowed).toBe(true);expect(executeCommandResult(s,command).status).toBe('applied');
  c.society.influencePressure.ideology=0;c.military.readiness=20;c.military.logistics=20;expect(affairsPreview(s,command)?.allowed).toBe(true);
 });
 it('shows the exact missing treasury and rejects without charging',()=>{
  const s=makeInitialState();s.countries.GRC.controllerCountryId='TUR';s.countries.TUR.economy.treasury=.1;
  const command={type:'integration/prepare',id:'GRC',kind:'services'} as const;
  expect(affairsPreview(s,command)?.shortfall).toBeCloseTo(.15);expect(executeCommandResult(s,command).state).toBe(s);
 });
 it('unfunded council aid spends neither influence nor money and records no vote',()=>{
  const s=makeInitialState();s.countries.TUR.economy.treasury=4.99;s.council.influenceByCountry.TUR=100;
  const next=proposeCouncilResolution(s,'humanitarian_aid','SYR');expect(next.council).toBe(s.council);expect(next.countries).toBe(s.countries);expect(next.sitrep[0]).toContain('$5B');
  s.countries.TUR.economy.treasury=5;for(const c of Object.values(s.countries)){if(c.diplomacy.relations.SYR)c.diplomacy.relations.SYR.score=100;}s.countries.SYR.politics.stability=0;
  const funded=proposeCouncilResolution(s,'humanitarian_aid','SYR');expect(funded.council.history[0].passed).toBe(true);expect(funded.countries.TUR.economy.treasury).toBe(0);expect(funded.countries.SYR.politics.stability).toBe(4);
 });
 it('election countdown only advances for electoral regimes',()=>{
  const c=makeInitialState().countries.TUR,economy={next:{inflation:2,unemployment:5},dailyGrowthRate:0} as Parameters<typeof simulatePolitics>[1],resources={foodShortage:false,oilShortage:false} as Parameters<typeof simulatePolitics>[2];
  for(const regime of ['democracy','republic','monarchy','autocracy'] as const){const n=simulatePolitics({...c,politics:{...c.politics,regime,electionDaysRemaining:30}},economy,resources);expect(n.electionDaysRemaining).toBe(['democracy','republic'].includes(regime)?29:30);}
 });
 it('conquest closes other fronts without another combat round, preserving the winning front',()=>{
  let s=applyGameCommand(withWarFuel(makeInitialState()),{type:'military/declareWar',targetCountryId:'GRC'});
  const first=Object.values(s.wars)[0];expect(first).toBeDefined();
  s={...s,wars:{[first.id]:{...first,status:'victory'},other:{...first,id:'other',attackerId:'GRC',defenderId:'BGR',defenderAllies:['FRA'],autoAssault:true}}};s.countries.GRC.controllerCountryId='TUR';
  s.countries.FRA.diplomacy.relations.GRC={...relationFor(s.countries.FRA,'GRC'),status:'war'};s.countries.GRC.diplomacy.relations.FRA={...relationFor(s.countries.GRC,'FRA'),status:'war'};
  const next=settleWarOutcome(s,first.id);expect(next.wars[first.id].status).toBe('victory');expect(next.wars.other.status).toBe('withdrawn');expect(next.wars.other.autoAssault).toBe(false);expect(next.wars.other.rounds).toBe(first.rounds);
  expect(relationFor(next.countries.FRA,'GRC').status).not.toBe('war');expect(next.countries.GRC.processedResources.fuel).toBe(s.countries.GRC.processedResources.fuel);
  expect(processAutoWars(next)).toBe(next);expect(resolveCombatRound(next,'other')).toBe(next);
 });
 it('old saves with dependent wars are normalized even when auto assault is off',()=>{
  let s=applyGameCommand(withWarFuel(makeInitialState()),{type:'military/declareWar',targetCountryId:'GRC'});const id=Object.keys(s.wars)[0];s.countries.GRC.controllerCountryId='TUR';
  expect(processAutoWars(s).wars[id].status).toBe('withdrawn');
 });
 it('every new message has all four translated variants',()=>{
  for(const [key,values] of Object.entries(UI_CATALOG_090))for(const [i,lang] of (['tr','es','zh','ru'] as const).entries()){expect(values[i].trim()).not.toBe('');expect(translateText(lang,key)).toBe(values[i]);}
 });
});
