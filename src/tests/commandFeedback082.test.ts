import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {creditOfferStatus,postCredit,expansion} from '../engine/systems/sovereignCredit';
import {diplomaticProposalStatus,proposalAcceptanceChance,requestDiplomacy,living,processLetters} from '../engine/systems/livingEconomy';
import {addTreaty,updateBilateralRelation,relationFor,relationshipStance} from '../engine/systems/diplomacy';
import {processTradeRelations} from '../engine/systems/worldDynamics';
import {executeCommandResult} from '../engine/commands';
import {snapshotGame} from '../persistence/snapshot';
import {migrateSave} from '../persistence/migrations';
const relations=(score:number)=>updateBilateralRelation(makeInitialState(),'TUR','BRA',r=>({...r,score}));
describe('credit requirements and receipts',()=>{
 it('reports cash shortfall and GDP cap without reserving money',()=>{
  const s=makeInitialState(),status=creditOfferStatus(s,'lend',1000,3,365);
  expect(status.allowed).toBe(false);expect(status.shortfall).toBeCloseTo(1000-s.countries.TUR.economy.treasury);expect(status.reasons.join(' ')).toContain('national limit');
  const result=executeCommandResult(s,{type:'credit/post',kind:'lend',principal:1000,apr:3,days:365});expect(result.status).toBe('unavailable');expect(result.message).toContain('Insufficient spendable');expect(result.state).toBe(s);
 });
 it('caps open offers and reserves a valid lending principal exactly once',()=>{
  let s=makeInitialState();const before=s.countries.TUR.economy.treasury;
  for(let i=0;i<3;i++)s=postCredit(s,'lend',1,3,365);
  expect(expansion(s).creditOffers.filter(x=>x.countryId==='TUR')).toHaveLength(3);expect(s.countries.TUR.economy.treasury).toBe(before-3);
  expect(creditOfferStatus(s,'lend',1,3,365).reasons.join(' ')).toContain('Three open');expect(postCredit(s,'lend',1,3,365)).toBe(s);
 });
});
describe('normalized trade trust policy',()=>{
 it('labels over 50 as Good and makes an otherwise identical proposal easier',()=>{
  const neutral=relations(0),good=relations(2);
  expect(relationshipStance(relationFor(neutral.countries.TUR,'BRA'))).toBe('NEUTRAL');expect(relationshipStance(relationFor(good.countries.TUR,'BRA'))).toBe('GOOD');
  expect(proposalAcceptanceChance(good,'TUR','BRA','trade_pact')).toBeGreaterThan(proposalAcceptanceChance(neutral,'TUR','BRA','trade_pact'));
 });
 it('blocks trade below 20 and accepts an eligible boundary request',()=>{
  const low=relations(-62);expect(diplomaticProposalStatus(low,'BRA','trade_pact').reason).toContain('20/100');expect(requestDiplomacy(low,'BRA','trade_pact')).toBe(low);
  expect(living(requestDiplomacy(relations(-60),'BRA','trade_pact')).letters).toHaveLength(1);
 });
 it('explains a funding failure if treasury changes before the reply',()=>{
  const s=requestDiplomacy(relations(60),'BRA','trade_pact');s.countries.TUR.economy.treasury=0;
  const n=processLetters({...s,day:s.day+3});expect(living(n).letters[0].message).toContain('treasury cannot pay');expect(living(n).letters[0].status).toBe('rejected');
 });
 it('warns, survives save/load, then ends a persistently poor pact and shipments',()=>{
  let s=addTreaty(relations(-62),'TUR','BRA','trade');s.tradeDeals.test={id:'test',buyerId:'TUR',sellerId:'BRA',resource:'food',quantityPerDay:1,pricePerUnit:.025,active:true};
  s=processTradeRelations(s);const start=s.day;expect(s.sitrep[0]).toContain('at risk');expect(relationFor(s.countries.TUR,'BRA').tradeStrainSinceDay).toBe(start);
  s=migrateSave(snapshotGame(s))!;s=processTradeRelations({...s,day:start+13});expect(relationFor(s.countries.TUR,'BRA').treaties).toContain('trade');
  s=processTradeRelations({...s,day:start+14});expect(relationFor(s.countries.TUR,'BRA').treaties).not.toContain('trade');expect(relationFor(s.countries.BRA,'TUR').treaties).not.toContain('trade');expect(s.tradeDeals.test.active).toBe(false);
 });
 it('restoring 20 clears the warning and restarts a future grace period',()=>{
  let s=processTradeRelations(addTreaty(relations(-62),'TUR','BRA','trade'));
  s=updateBilateralRelation({...s,day:s.day+10},'TUR','BRA',r=>({...r,score:-60}));s=processTradeRelations(s);expect(relationFor(s.countries.TUR,'BRA').tradeStrainSinceDay).toBeUndefined();
  s=updateBilateralRelation({...s,day:s.day+1},'TUR','BRA',r=>({...r,score:-62}));s=processTradeRelations(s);expect(relationFor(s.countries.TUR,'BRA').tradeStrainSinceDay).toBe(s.day);
 });
});

it('rejects a corrupt future trade warning timestamp on load',()=>{
 const s=addTreaty(relations(-62),'TUR','BRA','trade');s.countries.TUR.diplomacy.relations.BRA.tradeStrainSinceDay=s.day+1;expect(migrateSave(snapshotGame(s))).toBeNull();
});
