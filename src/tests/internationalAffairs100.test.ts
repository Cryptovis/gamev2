// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {version} from '../../package.json';
import {InternationalAffairsWorkspace,INTERNATIONAL_TABS} from '../ui/panels/InternationalAffairsWorkspace';
import {CommandRails} from '../ui/hud/CommandRails';
import {useGameStore} from '../store/gameStore';
import {makeInitialState} from '../data/initialState';
import type {GameState} from '../domain/game';
import type {OrganizationCommand,OrganizationFinancingRecord,OrganizationId,ExecutableResolutionPayload} from '../domain/organizations';
import {ORGANIZATION_IDS} from '../domain/organizations';
import {proposeResolution,castBallot} from '../engine/systems/organizations/commands';
import {processOrganizations} from '../engine/systems/organizations/tick';
import {quotaDeviationView,previewOrganizationCommand,initialProposalDraft,organizationProposalCommand,proposalKinds} from '../engine/systems/organizations/previews';
import {tickGame} from '../engine/tick';
import {resolveEvent} from '../engine/systems/events';
import {dismissVictory,pendingVictory} from '../engine/systems/victory';
import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {snapshotGame} from '../persistence/snapshot';
import {saveGame,loadSave} from '../persistence/saveGame';
import {db} from '../persistence/database';
import {canLoadSave,migrateSave,CURRENT_SCHEMA_VERSION} from '../persistence/migrations';
import {translateText} from '../i18n/localeText';
import {UI_CATALOG_100} from '../i18n/uiCatalog100';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const originalDispatch=useGameStore.getState().dispatch;
let host:HTMLDivElement,root:Root;
let dispatch=vi.fn(originalDispatch);
function ready(actor='USA'):GameState {
 const s=makeInitialState();s.playerCountryId=actor;s.selectedCountryId=actor;s.playerProfile={...s.playerProfile,language:'en',setupComplete:true};s.speed=0;s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;s.world.tutorial.active=false;
 for(const id of Object.keys(s.countries))s.council.influenceByCountry[id]=50;return recordEconomicHistory(s);
}
function request(s:GameState,org:OrganizationId,p:ExecutableResolutionPayload){return proposeResolution(s,org,p.kind==='finance'?'financeBoard':'plenary',p);}
function approve(s:GameState,id=`ORG-${s.world.organizations.nextSequence-1}`){const r=s.world.organizations.resolutions[id];if(!r)throw Error('fixture proposal rejected');for(const id of r.electorate.eligibleCountryIds)s=castBallot(s,r.id,'yes',id);return processOrganizations({...s,day:r.closesDay});}
function loanState(){let s=request(ready(),'imf',{kind:'finance',borrowerId:'USA',programId:'test',principalB:10,initialTrancheB:10,terms:{apr:3.65,termDays:90,graceDays:30,denomination:'USD'},conditions:[]});s=approve(s);return processOrganizations({...s,day:7});}
function quotaState(){return approve(request(ready('SAU'),'opecPlus',{kind:'oilQuota',quotas:{SAU:1},durationDays:365}));}
async function mount(s=ready(),component=InternationalAffairsWorkspace){await act(async()=>{useGameStore.setState({...s,dispatch,activeTool:null,workspaceTrail:[],navigation:null,actionReceipt:null});root.render(createElement(component));});}
function button(text:string,scope:ParentNode=document):HTMLButtonElement {const b=Array.from(scope.querySelectorAll('button')).find(b=>b.textContent?.trim()===text);if(!b)throw Error(`Missing button ${text}`);return b;}
async function click(b:HTMLElement){await act(async()=>b.click());}
async function tab(label:string){await click(button(label,host));}
async function input(label:string,value:string){const el=Array.from(host.querySelectorAll<HTMLInputElement>('input')).find(e=>e.getAttribute('aria-label')===label);if(!el)throw Error(`Missing input ${label}`);await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});}
async function select(label:string,value:string){const el=host.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`);if(!el)throw Error(`Missing select ${label}`);await act(async()=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));});}
async function confirm(){const b=document.querySelector<HTMLButtonElement>('[data-guide="review-confirm"]');if(!b)throw Error('Missing review confirmation');await click(b);}
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);dispatch=vi.fn(originalDispatch);});
afterEach(async()=>{await act(async()=>{root.unmount();useGameStore.setState({dispatch:originalDispatch,speed:0});});host.remove();vi.restoreAllMocks();});

describe('Grand launch workspace and accessible navigation',()=>{
 it('publishes 1.0.0 on Schema 18 and renders all fourteen canonical organizations',async()=>{
  await mount();expect(version).toBe('1.0.0');expect(CURRENT_SCHEMA_VERSION).toBe(18);
  expect(Array.from(host.querySelectorAll('[data-organization]')).map(x=>x.getAttribute('data-organization')).sort()).toEqual([...ORGANIZATION_IDS].sort());
  expect(host.textContent).toContain('World Economic Forum');expect(host.textContent).toContain('ASEAN');expect(host.textContent).toContain('New Development Bank');expect(host.textContent).toContain('Islamic Development Bank');
 });
 it.each(INTERNATIONAL_TABS)('switches to $label with one selected tab and matching panel label',async({label})=>{
  await mount();await tab(label);const selected=host.querySelectorAll('[role="tab"][aria-selected="true"]');expect(selected).toHaveLength(1);expect(selected[0].textContent).toBe(label);
  const panel=host.querySelector('[role="tabpanel"]')!;expect(panel.getAttribute('aria-labelledby')).toBe(selected[0].id);expect(host.querySelectorAll('[role="tabpanel"]')).toHaveLength(1);
 });
 it('supports arrow, Home and End navigation while keeping focus on the selected tab',async()=>{
  await mount();const first=button('Overview & roster',host);first.focus();await act(async()=>first.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));
  expect(document.activeElement).toBe(button('Resolutions & voting',host));expect(document.activeElement?.getAttribute('aria-selected')).toBe('true');
  await act(async()=>document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true})));expect(document.activeElement).toBe(button('Sanctions & enforcement',host));
  await act(async()=>document.activeElement!.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true})));expect(document.activeElement).toBe(first);
 });
 it('the Alliances rail button toggles the hub as its own workspace',async()=>{
  await mount(ready(),CommandRails);const rail=()=>host.querySelector<HTMLButtonElement>('[data-guide="rail-alliances"]')!;expect(rail().textContent).toContain('ALLIANCES');expect(rail().getAttribute('aria-pressed')).toBe('false');await click(rail());
  expect(useGameStore.getState().activeTool).toBe('alliances');expect(useGameStore.getState().navigation).toBeNull();expect(useGameStore.getState().selectedCountryId).toBeNull();expect(rail().getAttribute('aria-pressed')).toBe('true');
  expect(document.querySelector('#alliances-window .international-affairs')).not.toBeNull();
  await click(rail());expect(useGameStore.getState().activeTool).toBeNull();expect(rail().getAttribute('aria-pressed')).toBe('false');
 });
 it('keeps Chair offices separate from membership tier',async()=>{
  const s=ready();s.world.organizations.byId.un.memberships.USA.offices=[{role:'Chair',bodyId:'securityCouncil',untilDay:30}];await mount(s);const un=host.querySelector('[data-organization="un"]')!;
  expect(un.textContent).toContain('Permanent council');expect(un.textContent).toContain('Chair');expect(un.textContent).toContain('Security Council');
 });
});
describe('reviewed organization commands',()=>{
 it('reviews a ballot before dispatching the typed vote with one receipt',async()=>{
  const s=request(ready(),'un',{kind:'sanctions',targetId:'GRC',measures:[{scope:'arms',intensity:1,enforcement:1}],exemptions:[],durationDays:30});await mount(s);await tab('Resolutions & voting');await click(button('Yes',host));expect(dispatch).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Review ballot');await confirm();expect(dispatch).toHaveBeenCalledTimes(1);
  expect(dispatch.mock.calls[0][0]).toMatchObject({type:'organization/castBallot',resolutionId:'ORG-1',choice:'yes',commandId:expect.any(String)});expect(useGameStore.getState().world.organizations.resolutions['ORG-1'].ballots.USA).toBe('yes');
 });
 it('keeps cancellation side-effect free and releases the review pause on Escape',async()=>{
  const s=request(ready(),'un',{kind:'admission',applicantId:'TUR',tier:'Member'});await mount(s);await tab('Resolutions & voting');const trigger=button('Yes',host);trigger.focus();await click(trigger);
  await act(async()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(document.querySelector('[role="dialog"]')).toBeNull();expect(dispatch).not.toHaveBeenCalled();expect(document.activeElement).toBe(trigger);
 });
 it('shows the proposed target and terms in the voting card and ballot review',async()=>{
  const s=request(ready(),'un',{kind:'sanctions',targetId:'GRC',measures:[{scope:'trade',intensity:1,enforcement:1}],exemptions:[{scope:'humanitarian',countryIds:[]}],durationDays:45});await mount(s);await tab('Resolutions & voting');
  const card=host.querySelector('[data-resolution="ORG-1"]')!;expect(card.textContent).toContain('Greece');expect(card.textContent).toContain('Trade embargo');expect(card.textContent).toContain('45');await click(button('Yes',card));
  const review=document.querySelector('[role="dialog"]')!;expect(review.textContent).toContain('Greece');expect(review.textContent).toContain('Trade embargo');expect(review.textContent).toContain('Humanitarian');expect(dispatch).not.toHaveBeenCalled();
 });
 it('removes review listeners and releases its clock pause when the workspace unmounts',async()=>{
  const add=vi.spyOn(document,'addEventListener'),remove=vi.spyOn(document,'removeEventListener'),s=ready();s.speed=2;await mount(s);await tab('Resolutions & voting');await click(button('Review proposal',host));expect(useGameStore.getState().speed).toBe(0);
  const key=add.mock.calls.find(([event])=>event==='keydown');expect(key).toBeDefined();await act(async()=>root.render(null));expect(document.querySelector('[role="dialog"]')).toBeNull();expect(remove).toHaveBeenCalledWith('keydown',key![1],true);expect(useGameStore.getState().speed).toBe(2);expect(dispatch).not.toHaveBeenCalled();
 });
 it('revalidates an open review after its vote closes',async()=>{
  const s=request(ready(),'un',{kind:'admission',applicantId:'TUR',tier:'Member'});await mount(s);await tab('Resolutions & voting');await click(button('Yes',host));await act(async()=>useGameStore.setState({day:6}));
  expect(document.querySelector<HTMLButtonElement>('[data-guide="review-confirm"]')!.disabled).toBe(true);expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Voting has closed.');expect(dispatch).not.toHaveBeenCalled();
 });
 it('dispatches principal and interest repayment only after a transparent review',async()=>{
  const s=loanState(),f=s.world.organizations.financing['financing:ORG-1'] as OrganizationFinancingRecord;await mount(s);await tab('Financial facilities');await input('Principal payment ($B)','1');await input('Interest payment ($B)',String(f.lifecycle!.accruedInterestB));await click(button('Review repayment',host));
  expect(dispatch).not.toHaveBeenCalled();expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Treasury after ($B)');await confirm();expect(dispatch.mock.calls[0][0]).toMatchObject({type:'organization/repayOrganizationFinancing',financingId:f.id,principalB:1,interestB:f.lifecycle!.accruedInterestB,commandId:expect.any(String)});
  expect((useGameStore.getState().world.organizations.financing[f.id] as OrganizationFinancingRecord).outstandingB).toBe(9);
 });
 it('keeps cancelled facilities with outstanding debt visible by default',async()=>{
  let s=loanState();const f=s.world.organizations.financing['financing:ORG-1'] as OrganizationFinancingRecord;s={...s,world:{...s.world,organizations:{...s.world.organizations,financing:{...s.world.organizations.financing,[f.id]:{...f,status:'cancelled'}}}}};
  await mount(s);await tab('Financial facilities');expect(host.querySelector('[data-facility]')).not.toBeNull();
 });
 it('previews a quota deviation and dispatches the exact reviewed value',async()=>{
  const s=quotaState();await mount(s);await tab('Commodities & swaps');const deviation=s.countries.SAU.resourceProduction.oil*.05;await input('Daily quota deviation',String(deviation));const preview=quotaDeviationView(s,deviation);
  expect(host.textContent).toContain(preview.output.toFixed(4));expect(host.textContent).toContain(preview.standingPenalty.toFixed(2));await click(button('Review deviation',host));expect(dispatch).not.toHaveBeenCalled();await confirm();
  expect(dispatch.mock.calls[0][0]).toMatchObject({type:'organization/setOilQuotaDeviation',deviation,commandId:expect.any(String)});
 });
 it('reviews transfers of existing military reserves',async()=>{
  const s=ready();for(const [a,b] of [['USA','FRA'],['FRA','USA']])s.countries[a].diplomacy.relations[b]={score:90,status:'ally',sanctions:false,treaties:['trade','alliance']};s.production.USA.stockpile.fighters=10;
  await mount(s);await tab('Sanctions & enforcement');await select('Recipient','FRA');await select('Equipment','fighters');await input('Quantity','2');await click(button('Review hardware transfer',host));expect(dispatch).not.toHaveBeenCalled();await confirm();expect(dispatch.mock.calls[0][0]).toMatchObject({type:'organization/transferMilitaryHardware',recipientId:'FRA',equipment:'fighters',quantity:2});
 });
 it('creates a typed financing proposal from ordinary form fields',async()=>{
  await mount(ready('TUR'));await tab('Resolutions & voting');await select('Organization','imf');await input('Principal ($B)','2');await input('Initial tranche ($B)','2');await click(button('Review proposal',host));expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Influence fee');await confirm();
  expect(dispatch.mock.calls[0][0]).toMatchObject({type:'organization/proposeResolution',organizationId:'imf',bodyId:'financeBoard',payload:{kind:'finance',borrowerId:'TUR',principalB:2,initialTrancheB:2}});
 });
 it('disables malformed financial input instead of dispatching NaN',async()=>{
  await mount(ready('TUR'));await tab('Resolutions & voting');await select('Organization','imf');await input('Principal ($B)','');expect(button('Review proposal',host).disabled).toBe(true);expect(dispatch).not.toHaveBeenCalled();
 });
});
describe('localized launch copy and pure previews',()=>{
 it.each(['tr','es','zh','ru'] as const)('translates all registered hub copy in %s',language=>{
  const index=['tr','es','zh','ru'].indexOf(language);for(const [key,values] of Object.entries(UI_CATALOG_100)){expect(values).toHaveLength(4);expect(values[index].length).toBeGreaterThan(0);expect(translateText(language,key).toLocaleLowerCase(language)).toBe(values[index].toLocaleLowerCase(language));}
 });
 it.each(['tr','es','zh','ru'] as const)('renders translated tabs and reviews in %s',async language=>{
  const s=ready();s.playerProfile.language=language;await mount(s);for(const t of INTERNATIONAL_TABS)expect(host.textContent).toContain(translateText(language,t.label));
 });
 it('builds all supported proposal payloads without consuming RNG or mutating inputs',()=>{
  const s=ready(),before=snapshotGame(s);for(const org of ORGANIZATION_IDS)for(const kind of proposalKinds(org)){
   const d={...initialProposalDraft(s,org),kind},command=organizationProposalCommand(s,d);expect(command.type).toBe('organization/proposeResolution');previewOrganizationCommand(s,command);
  }expect(snapshotGame(s)).toEqual(before);
 });
});
describe('mounted world-year save and lifecycle regression',()=>{
 it('runs a full year with active quota UI mounted and resumes cleanly through IndexedDB',async()=>{
  let s=quotaState();await mount(s);await tab('Commodities & swaps');const start=s.day;
  for(let i=0;i<365;i++){
   if(s.activeEvent)s=resolveEvent(s,s.activeEvent.options[0].id);for(let v=pendingVictory(s);v;v=pendingVictory(s))s=dismissVictory(s,v.warId);
   const l=s.world.living;s={...s,activeEvent:null,activeAdvisor:null,world:{...s.world,tutorial:{...s.world.tutorial,active:false},living:l?{...l,notice:undefined,advice:{...l.advice,active:null}}:l}};
   await act(async()=>{s=tickGame(s);useGameStore.setState(s);});expect(s.day).toBe(start+i+1);
   if(i===182){expect(canLoadSave(s)).toBe(true);await saveGame(s,'launch-ui','Launch UI','guest');const loaded=await loadSave('launch-ui');expect(loaded).toEqual(s);s=loaded!;await act(async()=>useGameStore.setState(s));}
  }
  expect(canLoadSave(s)).toBe(true);expect(migrateSave(snapshotGame(s))).toEqual(s);expect(host.textContent).toContain('No active quota, trade remedy, integration or currency swap.');await db.saves.delete('launch-ui');
 },120000);
});
