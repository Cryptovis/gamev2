import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import type {GameState,TreatyType} from '../domain/game';
import type {OrganizationId} from '../domain/organizations';
import {COALITION_BASIS_LABELS,COLLECTIVE_DEFENSE_ORGANIZATIONS,JOIN_CHANCE,callAllies,charterAllies,coalitionCandidates} from '../engine/systems/warRules';
import {relationFor} from '../engine/systems/diplomacy';
import {nextRandom} from '../engine/rng';

/** Stage 1b.4: collective defense comes from live NATO/CSTO charter membership, not from bilateral treaties. */
function base():GameState {
 const s=makeInitialState();s.playerCountryId='BRA';
 // Treaties are diplomacy only: remove every alliance so the charter is the only collective-defense link.
 for(const c of Object.values(s.countries))for(const r of Object.values(c.diplomacy.relations))r.treaties=r.treaties.filter(t=>t!=='alliance');
 return s;
}
const membership=(s:GameState,org:OrganizationId,id:string)=>s.world.organizations.byId[org].memberships[id];
const basisOf=(s:GameState,attacker:string,defender:string,id:string)=>coalitionCandidates(s,attacker,defender).find(c=>c.countryId===id)?.basis;
const addTreaty=(s:GameState,a:string,b:string,t:TreatyType)=>{for(const [x,y] of [[a,b],[b,a]])if(!relationFor(s.countries[x],y).treaties.includes(t))s.countries[x].diplomacy.relations[y]={...relationFor(s.countries[x],y),treaties:[...relationFor(s.countries[x],y).treaties,t]};};

describe('charter collective defense',()=>{
 it('declares NATO and CSTO as the collective-defense organizations',()=>{
  expect([...COLLECTIVE_DEFENSE_ORGANIZATIONS]).toEqual(['nato','csto']);
  expect(JOIN_CHANCE.charter).toBe(.7);expect(COALITION_BASIS_LABELS.charter).toBe('Charter obligation (NATO/CSTO)');
 });
 it('a CSTO defender has charter candidates even though CSTO members share no treaties',()=>{
  const s=base(),csto=Object.values(s.world.organizations.byId.csto.memberships).filter(m=>m.status==='active'&&m.tier!=='Observer').map(m=>m.countryId);
  const defender=csto[0],allies=charterAllies(s,'POL',defender);
  expect(allies.length).toBeGreaterThan(0);
  for(const id of csto.filter(x=>x!==defender))expect(basisOf(s,'POL',defender,id)).toBe('charter');
  expect(coalitionCandidates(s,'POL',defender).find(c=>c.countryId===allies[0])?.charterOrganizationId).toBe('csto');
 });
 it('an expelled or suspended NATO member gives and receives no charter protection',()=>{
  for(const how of ['suspend','expel'] as const){
   const s=base();
   if(how==='suspend')membership(s,'nato','GBR').status='suspended';else delete s.world.organizations.byId.nato.memberships.GBR; // expulsion deletes the seat
   expect(basisOf(s,'RUS','DEU','GBR')).toBeUndefined();
   expect(basisOf(s,'RUS','DEU','FRA')).toBe('charter');
   expect(charterAllies(s,'RUS','GBR')).toEqual([]);
  }
 });
 it('a war between two members of the same organization triggers no charter obligation',()=>{
  const s=base();
  expect(charterAllies(s,'TUR','GRC')).toEqual([]);expect(charterAllies(s,'GRC','TUR')).toEqual([]);
  expect(coalitionCandidates(s,'TUR','GRC').filter(c=>c.basis==='charter')).toEqual([]);
  expect(coalitionCandidates(s,'RUS','GRC').filter(c=>c.basis==='charter').length).toBeGreaterThan(20);
 });
 it('an Observer neither defends nor is defended',()=>{
  const s=base();membership(s,'nato','FRA').tier='Observer';
  expect(basisOf(s,'RUS','DEU','FRA')).toBeUndefined();expect(charterAllies(s,'RUS','FRA')).toEqual([]);
 });
 it('a charter candidate with a non-aggression pact with the attacker stays out',()=>{
  const s=base();addTreaty(s,'FRA','RUS','nonAggression');
  expect(basisOf(s,'RUS','DEU','FRA')).toBeUndefined();expect(basisOf(s,'RUS','DEU','ITA')).toBe('charter');
 });
 it('records basis alliance when a treaty and a charter link coexist, and keeps treaty candidates first',()=>{
  const s=base();addTreaty(s,'FRA','DEU','alliance');
  expect(basisOf(s,'RUS','DEU','FRA')).toBe('alliance');
  const list=coalitionCandidates(s,'RUS','DEU');
  expect(list[0]).toEqual({countryId:'FRA',basis:'alliance'});
  expect(list.slice(1).every(c=>c.basis==='charter')).toBe(true);
  // A non-member with a treaty is still a treaty ally.
  addTreaty(s,'JPN','DEU','alliance');expect(basisOf(s,'RUS','DEU','JPN')).toBe('alliance');
 });
 it('charter membership beats the bloc basis',()=>{
  const s=base();s.blocs.B={id:'B',name:'B',leaderId:'DEU',memberIds:['DEU','FRA'],cohesion:70,doctrine:'collective_security'};
  expect(basisOf(s,'RUS','DEU','FRA')).toBe('charter');
 });
 it('does not create or remove treaties and does not mutate state',()=>{
  const s=base(),before=structuredClone(s);coalitionCandidates(s,'RUS','DEU');charterAllies(s,'RUS','DEU');
  expect(s).toEqual(before);
 });
 it('callAllies rolls once per candidate and charter joiners fight on the defender\'s side',()=>{
  const s=base(),war=(w:string)=>({id:w,attackerId:'RUS',defenderId:'DEU',status:'active'} as any);
  s.wars={W:war('W')};
  const candidates=coalitionCandidates(s,'RUS','DEU'),out=callAllies(s,'W');
  let seed=s.simulationSeed;const expected:string[]=[];
  for(const c of candidates){const r=nextRandom(seed);seed=r.seed;if(r.value<JOIN_CHANCE[c.basis])expected.push(c.countryId);}
  expect(out.simulationSeed).toBe(seed);
  expect(out.wars.W.defenderAllies??[]).toEqual(expected);
  expect(expected.length).toBeGreaterThan(0);
  expect(out.sitrep.some(l=>l.includes('under the NATO charter'))).toBe(true);
 });
});
