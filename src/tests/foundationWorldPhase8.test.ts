import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {snapshotGame} from '../persistence/snapshot';
import {canLoadSave,migrateSave} from '../persistence/migrations';
import {applyGameCommand} from '../engine/commands';
import {processWorldInstitutions,proposeAttack,executeWorldProposal,validateWorldProposal,previewOutreach,startOutreach} from '../engine/systems/worldInstitutions';
import {tickGame} from '../engine/tick';
import type {GameState} from '../domain/game';

function freeze<T>(x:T):T {if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
function ready(){const s=makeInitialState();s.world.members={un:['TUR','USA'],who:['TUR','USA'],security:['TUR','USA']};s.council.influenceByCountry={TUR:20,USA:20};return s;}
function conflict(s:GameState,attackerId='USA',defenderId='GRC'){
 s.day=30;s.wars.test={id:'test',attackerId,defenderId,status:'active'} as GameState['wars'][string];return s;
}

describe('Phase 8 foundation: institution save validation',()=>{
 it.each([NaN,Infinity,-Infinity,-1,101])('rejects invalid influence %s during validation and migration',value=>{
  const s=ready();s.council.influenceByCountry.USA=value;
  expect(canLoadSave(s)).toBe(false);expect(migrateSave(s)).toBeNull();
 });
 it.each([
  ['missing UN members',s=>{delete (s.world.members as Partial<typeof s.world.members>).un;}],
  ['unknown member',s=>{s.world.members.un.push('missing');}],
  ['duplicate member',s=>{s.world.members.un.push('USA');}],
  ['invalid ballot',s=>{s.world.ballots.push(null as unknown as typeof s.world.ballots[number]);}],
  ['invalid mission',s=>{s.world.missions.push({targetId:'missing'} as typeof s.world.missions[number]);}],
  ['non-finite religious share',s=>{s.world.religiousShares.USA={islam:NaN};}],
  ['invalid council history',s=>{s.council.history.push(null as unknown as typeof s.council.history[number]);}],
 ] satisfies Array<[string,(s:GameState)=>void]>)('rejects %s',(name,corrupt)=>{
  const s=ready();corrupt(s);expect(canLoadSave(s)).toBe(false);expect(migrateSave(s)).toBeNull();
 });
 it('rejects malformed ballot votes and foreign references in otherwise valid ballots',()=>{
  const s=proposeAttack(ready(),'GRC');
  for(const corrupt of [
   (s:GameState)=>{s.world.ballots[0].votes.USA='invalid' as 'yes';},
   (s:GameState)=>{s.world.ballots[0].targetId='missing';},
   (s:GameState)=>{s.world.ballots[0].votes.missing='yes';},
   (s:GameState)=>{s.world.ballots[0].closesDay=NaN;},
  ]){const bad=snapshotGame(s);corrupt(bad);expect(migrateSave(bad)).toBeNull();}
 });
 it('roundtrips valid ballots, missions and council history without changing schema',()=>{
  let s=proposeAttack(ready(),'GRC');s.countries.TUR.diplomacy.relations.GRC.score=50;
  s=startOutreach(s,'GRC','islam');
  s.council.history=[{id:'test',type:'sanctions',proposerId:'USA',targetCountryId:'GRC',supportPercent:55,passed:true,day:s.day,summary:'test'}];
  expect(canLoadSave(snapshotGame(s))).toBe(true);
  const loaded=migrateSave(snapshotGame(s))!;expect(loaded.schemaVersion).toBe(18);
  expect(loaded.world.ballots).toEqual(s.world.ballots);expect(loaded.world.missions).toEqual(s.world.missions);expect(loaded.council).toEqual(s.council);
 });
});

describe('Phase 8 foundation: shared proposal rules and member benefits',()=>{
 it('AI and player commands charge the same 8 influence and reject repeated submissions',()=>{
  const ai=executeWorldProposal(ready(),{type:'world/attackProposal',id:'GRC'},'USA');
  const human=applyGameCommand({...ready(),playerCountryId:'USA'},{type:'world/attackProposal',id:'GRC'});
  expect(ai.council.influenceByCountry.USA).toBe(12);expect(human.council).toEqual(ai.council);
  expect(ai.world.ballots[0].proposerId).toBe('USA');expect(human.world.ballots[0].id).toBe(ai.world.ballots[0].id);
  expect(executeWorldProposal(ai,{type:'world/attackProposal',id:'GRC'},'USA')).toBe(ai);
 });
 it.each([0,7,NaN])('both actors reject insufficient or invalid influence %s',influence=>{
  const s=ready();s.council.influenceByCountry.USA=influence;
  const cmd={type:'world/attackProposal',id:'GRC'} as const;
  expect(validateWorldProposal(s,cmd,'USA')).toBe(false);expect(executeWorldProposal(s,cmd,'USA')).toBe(s);
  const human={...s,playerCountryId:'USA'};expect(applyGameCommand(human,cmd)).toBe(human);
 });
 it('AI proposals in the daily processor pay the fee exactly once',()=>{
  const s=conflict(ready());const n=processWorldInstitutions(s);
  expect(n.world.ballots.filter(b=>b.proposerId==='USA')).toHaveLength(1);
  expect(n.council.influenceByCountry.USA).toBeCloseTo(20+.08-8);
  const again=processWorldInstitutions(n);expect(again.world.ballots).toEqual(n.world.ballots);
  expect(again.council.influenceByCountry.USA).toBeCloseTo(n.council.influenceByCountry.USA+.08);
 });
 it('the daily AI scheduler cannot create a free proposal',()=>{
  const s=conflict(ready());s.council.influenceByCountry.USA=0;
  const n=processWorldInstitutions(s);expect(n.world.ballots).toEqual([]);expect(n.council.influenceByCountry.USA).toBeCloseTo(.08);
 });
 it('shares membership validators and fees across actor identities',()=>{
  const s=ready();s.world.members.un=[];s.countries.USA.politics.stability=80;s.countries.USA.diplomacy.reputation=80;
  const cmd={type:'world/membership',id:'un'} as const;
  const ai=executeWorldProposal(s,cmd,'USA'),human=applyGameCommand({...s,playerCountryId:'USA'},cmd);
  expect(ai.council.influenceByCountry.USA).toBe(15);expect(human.council).toEqual(ai.council);
  expect(ai.world.ballots[0].targetId).toBe('USA');
 });
 it('applies identical membership and public diplomacy benefits to every active member',()=>{
  const s=ready();for(const id of ['TUR','USA']){s.countries[id].society.cohesion=50;s.countries[id].technology.unlocked.push('soc-public-diplomacy');}
  const n=processWorldInstitutions(freeze(s));
  for(const id of ['TUR','USA']){expect(n.council.influenceByCountry[id]).toBeCloseTo(20+.12);expect(n.countries[id].society.cohesion).toBeCloseTo(50.02);}
  expect(s.countries.USA.society.cohesion).toBe(50);
 });
 it('caps benefits and excludes annexed countries even when their legacy membership remains',()=>{
  const s=ready();s.countries.USA.annexedBy='TUR';s.council.influenceByCountry.TUR=99.99;s.countries.TUR.society.cohesion=99.99;
  const n=processWorldInstitutions(s);expect(n.council.influenceByCountry.TUR).toBe(100);expect(n.countries.TUR.society.cohesion).toBe(100);
  expect(n.council.influenceByCountry.USA).toBe(20);expect(n.countries.USA).toBe(s.countries.USA);
 });
});

describe('Phase 8 foundation: authoritative outreach preview',()=>{
 it('is pure and matches the charged cost and stored mission chance',()=>{
  const s=ready();s.countries.TUR.diplomacy.relations.GRC.score=50;s.culturalInfluence.GRC=30;freeze(s);
  const preview=previewOutreach(s,'GRC'),next=startOutreach(s,'GRC','islam');
  expect(preview.allowed).toBe(true);expect(next.countries.TUR.economy.treasury).toBe(preview.treasuryAfter);
  expect(s.countries.TUR.economy.treasury-next.countries.TUR.economy.treasury).toBeCloseTo(preview.cost);
  expect(next.world.missions[0].chance).toBe(preview.chance);expect(next.simulationSeed).toBe(s.simulationSeed);
 });
 it('checks every mission rather than just the latest displayed entry',()=>{
  let s=ready();s.countries.TUR.diplomacy.relations.GRC.score=50;s=startOutreach(s,'GRC','islam');
  s.world.missions.unshift({...s.world.missions[0],id:'old',status:'failed',endsDay:0});s.day=100;
  expect(previewOutreach(s,'GRC').allowed).toBe(false);expect(startOutreach(s,'GRC','islam')).toBe(s);
 });
 it('revalidates funds, relations, cooldown boundaries, and invalid targets',()=>{
  const s=ready();s.countries.TUR.diplomacy.relations.GRC.score=50;const preview=previewOutreach(s,'GRC');
  const funded=snapshotGame(s);funded.countries.TUR.economy.treasury=preview.cost;expect(previewOutreach(funded,'GRC').allowed).toBe(true);
  funded.countries.TUR.economy.treasury=preview.cost-1e-8;expect(previewOutreach(funded,'GRC').allowed).toBe(false);expect(startOutreach(funded,'GRC','islam')).toBe(funded);
  const hostile=snapshotGame(s);hostile.countries.TUR.diplomacy.relations.GRC.score=-1;expect(previewOutreach(hostile,'GRC').allowed).toBe(false);
  for(const id of ['TUR','missing']){expect(previewOutreach(s,id).allowed).toBe(false);expect(startOutreach(s,id,'islam')).toBe(s);}
  const ended=startOutreach(s,'GRC','islam');ended.world.missions[0].status='failed';ended.day=90;
  expect(previewOutreach(ended,'GRC').allowed).toBe(false);ended.day=91;expect(previewOutreach(ended,'GRC').allowed).toBe(true);
 });
 it('keeps repeated ticks deterministic without mutating frozen inputs',()=>{
  const s=freeze(ready());expect(tickGame(s)).toEqual(tickGame(s));
 });
});
