import {describe,it,expect,vi} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {applyGameCommand} from '../engine/commands';
import {longTermContractPreview,processTradeDeals} from '../engine/systems/trade';
import {warFuelReadiness,warDeclarationStatus,openWar} from '../engine/systems/warRules';
import {updateBilateralRelation} from '../engine/systems/diplomacy';
import {campaignInterval} from '../engine/clock';
import {retryImport} from '../ui/retryImport';
import {maybeCreateResourceAdvisor} from '../engine/systems/advisor';
import {migrateSave} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';
import {processWellbeing} from '../engine/systems/livingEconomy';
import {UI_CATALOG_089_J} from '../i18n/uiCatalog089J';
import {translateText} from '../i18n/localeText';
import {useGameStore} from '../store/gameStore';

function tradeState(score=0){let s=makeInitialState();s.countries.TUR.economy.treasury=100000;s.countries.BGR.resources.oil=10000;return updateBilateralRelation(s,'TUR','BGR',r=>({...r,score,status:'neutral',treaties:['trade']}));}
describe('0.89.4 contracts and war preparation',()=>{
 it('requires strictly more than 40/100 relations in both preview and command',()=>{
  const s=tradeState(-20);expect(longTermContractPreview(s,'TUR','BGR','oil',1).reason).toContain('40/100');
  const blocked=applyGameCommand(s,{type:'trade/createLongTermContract',targetCountryId:'BGR',resource:'oil',years:1});expect(blocked.tradeDeals).toEqual(s.tradeDeals);expect(blocked.countries).toBe(s.countries);
  const ready=tradeState(-18);expect(longTermContractPreview(ready,'TUR','BGR','oil',1).allowed).toBe(true);
 });
 it.each([1,3,5,10] as const)('signs a %s-year monthly contract, replaces daily flow, and does not double-charge',years=>{
  const s=applyGameCommand(tradeState(),{type:'trade/createImport',targetCountryId:'BGR',resource:'oil'}),before=s.countries.TUR.economy.treasury;
  const command={type:'trade/createLongTermContract' as const,targetCountryId:'BGR',resource:'oil' as const,years,commandId:'monthly-contract'};
  const signed=applyGameCommand(s,command),deal=Object.values(signed.tradeDeals).find(d=>d.active&&d.contractType==='long_term')!;
  expect(deal.expiresDay).toBe(s.day+365*years);expect(deal.deliveryIntervalDays).toBe(30);expect(signed.countries.TUR.economy.treasury).toBe(before);
  expect(Object.values(signed.tradeDeals).filter(d=>d.active&&d.buyerId==='TUR'&&d.sellerId==='BGR'&&d.resource==='oil')).toHaveLength(1);
  expect(applyGameCommand(signed,command)).toBe(signed);const loaded=migrateSave(snapshotGame(signed))!;expect(loaded).not.toBeNull();expect(applyGameCommand(loaded,command)).toBe(loaded);
  expect(applyGameCommand(signed,{...command,commandId:'another-click'}).sitrep[0]).toContain('already active');
  const delivered=processTradeDeals({...signed,day:deal.nextDeliveryDay!});expect(delivered.countries.TUR.economy.treasury).toBeLessThan(before);expect(delivered.countries.TUR.resources.oil).toBeGreaterThan(signed.countries.TUR.resources.oil);
 });
 it('requires trade access, surplus and funds, and rechecks conditions at confirmation',()=>{
  const s=tradeState();s.countries.TUR.economy.treasury=0;expect(longTermContractPreview(s,'TUR','BGR','oil',1).reason).toContain('payment');
  s.countries.TUR.economy.treasury=100000;s.countries.TUR.diplomacy.relations.BGR.treaties=[];expect(longTermContractPreview(s,'TUR','BGR','oil',1).reason).toContain('pact');
 });
 it('crude oil cannot bypass refined fuel readiness; the threshold applies to player and AI',()=>{
  const s=makeInitialState();s.countries.TUR.resources.oil=100000;s.countries.TUR.processedResources.fuel=0;
  const need=warFuelReadiness(s,'TUR');expect(need.missing).toBeGreaterThan(0);expect(warDeclarationStatus(s,'TUR','GRC').block).toBe('fuel');expect(openWar(s,'TUR','GRC',true).warId).toBeNull();
  const blocked=applyGameCommand(s,{type:'military/declareWar',targetCountryId:'GRC'});expect(blocked.wars).toEqual(s.wars);expect(blocked.countries).toBe(s.countries);expect(blocked.sitrep[0]).toContain('14');
  s.countries.TUR.processedResources.fuel=need.required-.01;expect(warDeclarationStatus(s,'TUR','GRC').allowed).toBe(false);
  s.countries.TUR.processedResources.fuel=need.required;expect(warDeclarationStatus(s,'TUR','GRC').allowed).toBe(true);
 });
 it('starts auto assault at 5×, one day per second, and still obeys explicit pause and decisions',()=>{
  const s=makeInitialState();s.countries.TUR.processedResources.fuel=warFuelReadiness(s,'TUR').required;const opened=openWar(s,'TUR','GRC');
  opened.state.world.living!.advice.active='fuel';opened.state.activeAdvisor={id:'old-oil-prompt',stage:'contract',resource:'oil',supplierId:'BGR',createdDay:opened.state.day,message:'Old saved prompt'};
  useGameStore.setState({...opened.state,actionReceipt:null});useGameStore.getState().setAutoAssault(opened.warId!,true);expect(useGameStore.getState().speed).toBe(5);expect(useGameStore.getState().activeAdvisor).toBeNull();expect(useGameStore.getState().world.living!.advice.active).toBeNull();
  expect(campaignInterval(5,true)).toBe(1000);expect(campaignInterval(0,true)).toBeNull();expect(campaignInterval(5,true,true)).toBeNull();
 });
 it('does not raise an oil advisor in an active player war',()=>{
  const s=makeInitialState();s.countries.TUR.processedResources.fuel=1000;let n=openWar(s,'TUR','GRC').state;n={...n,day:10,activeAdvisor:null,activeEvent:null,advisorCooldownUntil:0};
  n.countries.TUR.resources.oil=0;n.world.living!.advice.suppressed=['food'];expect(maybeCreateResourceAdvisor(n).activeAdvisor?.resource).not.toBe('oil');
 });
 it('keeps low refined fuel advice nonblocking during war without suppressing unrelated advice',()=>{
  const s=makeInitialState();s.countries.TUR.processedResources.fuel=1000;const n=openWar(s,'TUR','GRC').state;n.countries.TUR.processedResources.fuel=0;n.world.tutorial.active=false;n.world.living!.advice.active=null;n.world.living!.advice.lastPopupDay=-100;n.world.living!.advice.suppressed=['approval','food','population','inflation'];n.speed=5;
  const result=processWellbeing(n);expect(result.world.living!.advice.active).toBeNull();expect(result.speed).toBe(5);expect(result.world.living!.advice.suppressed).not.toContain('fuel');
 });
 it('provides reviewed translations for every new prompt',()=>{for(const key of Object.keys(UI_CATALOG_089_J))for(const lang of ['tr','es','zh','ru'])expect(translateText(lang,key)).not.toBe(key);});
});
describe('transient module loading',()=>{
 it('recovers from two transient fetch failures without reloading the campaign',async()=>{const load=vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module: /CountryPanel.tsx')).mockRejectedValueOnce(new TypeError('Importing a module script failed')).mockResolvedValue({default:'panel'}),wait=vi.fn().mockResolvedValue(undefined);expect(await retryImport(load,wait)).toEqual({default:'panel'});expect(wait.mock.calls).toEqual([[400],[800]]);});
 it('caps retries and leaves the real failure available to the error boundary',async()=>{const load=vi.fn().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));await expect(retryImport(load,async()=>{})).rejects.toThrow('Failed to fetch');expect(load).toHaveBeenCalledTimes(3);});
 it('never retries a programming error',async()=>{const load=vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'));await expect(retryImport(load,async()=>{})).rejects.toThrow('Unexpected token');expect(load).toHaveBeenCalledTimes(1);});
});
