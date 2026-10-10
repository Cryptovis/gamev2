import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {applyGameCommand,executeCommandResult} from '../engine/commands';
import {postCredit,acceptCredit,expansion,creditTermDays,applyForCredit,creditApplicationPreview,processCredit,creditRating,repaymentPreview,repayCredit,emergencyCreditOffers,availableCreditOffers,loanTotal} from '../engine/systems/sovereignCredit';
import {campusPreview,pilotTrainingPreview,buildCampus,hirePilots,academyFor} from '../engine/systems/governance';
import {consolidateTerritory} from '../engine/systems/integration';
import {translateText} from '../i18n/localeText';
import {worldRankings} from '../engine/systems/worldRankings';
import {validSaveShape} from '../persistence/validation';
import {snapshotGame} from '../persistence/snapshot';
import {migrateSave} from '../persistence/migrations';
import {UI_CATALOG_0904} from '../i18n/uiCatalog0904';
import {commandReceipt} from '../store/commandReceipt';
const ready=()=>{
 const s=makeInitialState();for(const id of ['TUR','FRA','DEU','GBR']){const c=s.countries[id];c.economy={...c.economy,treasury:100,gdp:1000,debt:100,inflation:2};c.politics.stability=90;c.diplomacy.reputation=80;}
 s.countries.TUR.diplomacy.relations.FRA={score:70,status:'friendly',sanctions:false,treaties:[]};s.countries.FRA.diplomacy.relations.TUR={...s.countries.TUR.diplomacy.relations.FRA};return s;
};
const offered=()=>{const s=postCredit(ready(),'lend',5,5,365,'FRA');return {s,id:expansion(s).creditOffers[0].id};};
const financed=()=>{const {s,id}=offered();const n=acceptCredit(s,id);return {s:n,id:expansion(n).loans[0].id};};
const cash=(s:ReturnType<typeof ready>)=>Object.values(s.countries).reduce((n,c)=>n+c.economy.treasury,0);
describe('0904 sovereign credit lifecycle',()=>{
 it('queues an application without crediting cash or debt, funds only after three days and conserves cash',()=>{
  const {s,id}=offered(),view=creditApplicationPreview(s,id),n=applyForCredit(s,id);
  expect(n.countries).toBe(s.countries);expect(expansion(n).loans).toHaveLength(0);expect(expansion(n).creditApplications![0].decisionDay).toBe(s.day+3);
  expect(applyForCredit(n,id)).toBe(n);expect(expansion(processCredit({...n,day:3},false)).loans).toHaveLength(0);
  const funded=processCredit({...n,day:4},false);expect(expansion(funded).creditApplications![0].status).toBe('approved');expect(expansion(funded).loans[0].apr).toBe(view.apr);
  expect(funded.countries.TUR.economy.treasury-s.countries.TUR.economy.treasury).toBe(5);expect(cash(funded)).toBeCloseTo(cash(s)+5);
  expect(expansion(processCredit(funded,false)).loans).toHaveLength(1);
 });
 it('rejects low relations at decision without releasing lender escrow or inventing borrower cash',()=>{
  const {s,id}=offered(),n=applyForCredit(s,id);n.countries.TUR.diplomacy.relations.FRA.score=-70;
  const rejected=processCredit({...n,day:4},false);expect(expansion(rejected).creditApplications![0].status).toBe('rejected');expect(expansion(rejected).loans).toHaveLength(0);expect(rejected.countries.TUR.economy.treasury).toBe(100);expect(rejected.countries.FRA.economy.treasury).toBe(95);
 });
 it('rechecks lender liquidity and sanctions, and closes expired offers without double-returning escrow',()=>{
  let s=postCredit(ready(),'borrow',5,8,365),id=expansion(s).creditOffers[0].id;s=applyForCredit(s,id,'FRA');s.countries.FRA.economy.treasury=0;
  expect(expansion(processCredit({...s,day:4},false)).creditApplications![0].status).toBe('rejected');
  const o=offered(),n=applyForCredit(o.s,o.id);n.countries.FRA.globalSanctions=true;expect(expansion(processCredit({...n,day:4},false)).loans).toHaveLength(0);
  const fresh=offered(),expired=processCredit({...applyForCredit(fresh.s,fresh.id),day:40},false);expect(expansion(expired).creditApplications![0].status).toBe('rejected');expect(expired.countries.FRA.economy.treasury).toBe(100);expect(processCredit(expired,false).countries.FRA.economy.treasury).toBe(100);
 });
 it('does not let two applicants take the same offer or exceed aggregate capacity',()=>{
  const {s,id}=offered();let n=applyForCredit(s,id);n=applyForCredit(n,id,'DEU');n=processCredit({...n,day:4},false);expect(expansion(n).loans).toHaveLength(1);expect(expansion(n).creditApplications!.filter(a=>a.status==='approved')).toHaveLength(1);
  const full=offered();full.s.countries.TUR.economy.gdp=1;expect(creditApplicationPreview(full.s,full.id).allowed).toBe(false);
 });
 it('typed commands are idempotent and receipts say submitted rather than funded',()=>{
  const {s,id}=offered(),command={type:'credit/accept',id,commandId:'apply-once'} as const,result=executeCommandResult(s,command);
  expect(result.status).toBe('applied');expect(executeCommandResult(result.state,command).status).toBe('duplicate');expect(commandReceipt(s,command,result).title).toBe('Credit application submitted');expect(expansion(result.state).loans).toHaveLength(0);
 });
 it('rates every country, lowers APR for strong finances and increases lender choice',()=>{
  let s=ready();for(const id of ['FRA','DEU','GBR'])s=postCredit(s,'lend',1,5,365,id);
  const offer=expansion(s).creditOffers[0].id,goodRate=creditApplicationPreview(s,offer).apr,goodScore=creditRating(s,'TUR');
  expect(Object.values(s.countries).every(c=>Number.isFinite(creditRating(s,c.id).score))).toBe(true);
  s.countries.TUR.economy.debt=1300;s.countries.TUR.economy.inflation=8;s.countries.TUR.economy.treasury=0;s.countries.TUR.politics.stability=50;
  expect(creditRating(s,'TUR').score).toBeLessThan(goodScore.score);expect(creditApplicationPreview(s,offer).apr).toBeGreaterThan(goodRate);expect(availableCreditOffers(s)).toHaveLength(0);
 });
 it('offers larger, costlier three-year rescue credit only to a cash-poor independent country',()=>{
  const s=ready();s.countries.TUR.economy.treasury=1;const before=cash(s),n=emergencyCreditOffers(s),offers=expansion(n).creditOffers.filter(o=>o.emergency);
  expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>o.targetCountryId==='TUR'&&creditTermDays(o)===1095&&o.principal>1)).toBe(true);
  expect(cash(n)+offers.reduce((v,o)=>v+o.principal,0)).toBeCloseTo(before);expect(emergencyCreditOffers(n)).toBe(n);
  expect(availableCreditOffers(n,'DEU').some(o=>o.emergency)).toBe(false);expect(creditApplicationPreview(n,offers[0].id,'DEU').allowed).toBe(false);
  expect(expansion(emergencyCreditOffers(ready())).creditOffers).toHaveLength(0);
 });
 it('early repayment transfers only accrued interest, removes principal debt, saves future interest and rewards material history',()=>{
  const {s,id}=financed(),at={...s,day:31},view=repaymentPreview(at,id),score=creditRating(at,'TUR').score,n=repayCredit(at,id);
  expect(view.amount).toBeCloseTo(loanTotal(5,5,30));expect(view.interestSaved).toBeGreaterThan(0);expect(cash(n)).toBeCloseTo(cash(at));expect(n.countries.TUR.economy.debt).toBe(100);expect(expansion(n).loans[0].status).toBe('paid');expect(creditRating(n,'TUR').score).toBeGreaterThan(score);expect(expansion(n).creditHistory!.TUR.bonus).toBeGreaterThan(0);expect(repayCredit(n,id)).toBe(n);
 });
 it('blocks unaffordable/foreign repayments and gives no reward for immediate or tiny-loan churn',()=>{
  const {s,id}=financed();expect(repaymentPreview(s,id,'DEU').allowed).toBe(false);expect(repaymentPreview(s,id).scoreGain).toBe(0);
  s.countries.TUR.economy.treasury=0;expect(repayCredit(s,id)).toBe(s);
  let n=postCredit(ready(),'lend',.001,5,365,'FRA');n=acceptCredit(n,expansion(n).creditOffers[0].id);expect(repaymentPreview({...n,day:31},expansion(n).loans[0].id).scoreGain).toBe(0);
 });
 it('settles arrears once and restores the original tax rate',()=>{
  const {s,id}=financed(),loan=expansion(s).loans[0];s.world.expansion={...expansion(s),loans:[{...loan,status:'arrears',interestBooked:true,outstanding:2}],forcedTaxes:{TUR:17}};s.countries.TUR.economy.taxRate=45;s.countries.TUR.economy.debt=102;
  const n=repayCredit({...s,day:400},id);expect(n.countries.TUR.economy.debt).toBe(100);expect(n.countries.TUR.economy.taxRate).toBe(17);expect(expansion(n).forcedTaxes.TUR).toBeUndefined();expect(repaymentPreview(n,id).allowed).toBe(false);
 });
 it('preserves old schema-17 saves and pending applications through reload; rejects malformed optional credit fields',()=>{
  const {s,id}=offered();expect(validSaveShape(snapshotGame(s))).toBe(true);
  const n=applyForCredit(s,id),saved=snapshotGame(n);expect(validSaveShape(saved)).toBe(true);expect(expansion(migrateSave(saved)!).creditApplications![0].status).toBe('pending');
  const bad=snapshotGame(n);bad.world.expansion!.creditApplications![0].apr=Infinity;expect(validSaveShape(bad)).toBe(false);
  const future=snapshotGame(n);future.world.expansion!.creditApplications![0].createdDay=100;expect(validSaveShape(future)).toBe(false);
 });
 it('retains valid application history after old offers are pruned',()=>{
  const {s,id}=offered();const n=processCredit({...applyForCredit(s,id),day:4},false);n.world.expansion!.creditOffers=[];expect(validSaveShape(snapshotGame(n))).toBe(true);expect(expansion(migrateSave(snapshotGame(n))!).creditApplications![0].status).toBe('approved');
 });
 it('cancels a pending application when its lender is absorbed and keeps the save valid',()=>{
  const {s,id}=offered(),pending=applyForCredit(s,id);pending.countries.FRA.controllerCountryId='TUR';const n=consolidateTerritory(pending,'FRA','TUR');
  expect(expansion(n).creditApplications![0].status).toBe('rejected');expect(expansion(processCredit({...n,day:4},false)).loans).toHaveLength(0);expect(validSaveShape(snapshotGame(n))).toBe(true);
 });
 it('keeps a three-year rescue loan finite and settles its maturity without duplicated cash',()=>{
  const s=ready();s.countries.TUR.economy.treasury=1;let n=emergencyCreditOffers(s);const offer=expansion(n).creditOffers.find(o=>o.emergency&&creditApplicationPreview(n,o.id).decisionReason===null)!;
  expect(offer).toBeDefined();n=applyForCredit(n,offer.id);n=processCredit({...n,day:4},false);const loan=expansion(n).loans[0];expect(loan.dueDay).toBe(1099);
  for(let day=5;day<=1100;day++)n=processCredit({...n,day},false);
  expect(expansion(n).loans[0].status).toBe('paid');expect(Object.values(n.countries).every(c=>Number.isFinite(c.economy.treasury))).toBe(true);expect(validSaveShape(snapshotGame(n))).toBe(true);
 });
});
describe('0904 rankings and localization',()=>{
 it('sorts live rankings, excludes absorbed countries and uses current fiscal/diplomatic metrics',()=>{
  const s=ready();s.countries.FRA.economy.gdp=100000;s.countries.GRC.annexedBy='TUR';expect(worldRankings(s,'financial')[0].country.id).toBe('FRA');expect(worldRankings(s,'military').some(r=>r.country.id==='GRC')).toBe(false);const r=worldRankings(s,'diplomacy').find(r=>r.country.id==='TUR')!;expect(r.score).toBeCloseTo(s.countries.TUR.diplomacy.reputation*.6+(s.council.influenceByCountry.TUR??0)*.3+Math.min(10,r.allies));
 });
 it('campus and pilot reviews use the same eligibility, payment and duration as their commands',()=>{
  const s=ready(),campus=campusPreview(s,'university'),n=buildCampus(s,'university');expect(campus.allowed).toBe(true);expect(n.countries.TUR.economy.treasury).toBe(campus.treasuryAfter);expect(academyFor(n,'TUR').projects[0].readyDay).toBe(campus.completionDay);
  const pilot=pilotTrainingPreview(s,50),hired=hirePilots(s,50);expect(hired.countries.TUR.economy.treasury).toBe(s.countries.TUR.economy.treasury-pilot.cost);expect(academyFor(hired,'TUR').training.at(-1)!.readyDay).toBe(s.day+pilot.days);expect(campusPreview(s,'missing' as never).allowed).toBe(false);
 });
 it('translates delayed decision news and keeps country names in every supported language',()=>{
  for(const language of ['tr','es','zh','ru']){const text=translateText(language,'Credit approved · France → Türkiye');expect(text).not.toContain('Credit approved');expect(text).toContain('→');}
 });
 it('includes four distinct nonempty translations for every new source string',()=>{for(const [key,values] of Object.entries(UI_CATALOG_0904)){expect(values).toHaveLength(4);for(const value of values){expect(value.trim(),key).not.toBe('');expect(value,key).not.toBe(key);}}});
});
