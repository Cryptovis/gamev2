import {recordEconomicHistory} from '../engine/systems/economicHistory';
import {describe,it,expect} from 'vitest';
import {makeInitialState} from '../data/initialState';
import {evaluateVotingOutcome} from '../engine/systems/organizations/voting';
import {applyOrganizationCommand,proposeResolution,castBallot} from '../engine/systems/organizations/commands';
import {validateOrganizationCommand} from '../engine/systems/organizations/validation';
import {processOrganizations} from '../engine/systems/organizations/tick';
import {processOrganizationAiVotes} from '../engine/systems/organizations/ai';
import {applyGameCommand,executeCommandResult} from '../engine/commands';
import {processWorldInstitutions,applyMembership} from '../engine/systems/worldInstitutions';
import {tickGame} from '../engine/tick';
import {snapshotGame} from '../persistence/snapshot';
import {canLoadSave,migrateSave} from '../persistence/migrations';
import {P5_COUNTRY_IDS,type ElectorateSnapshot,type VotingRule,type FoundationalResolutionPayload,type OrganizationCommand,type OrganizationSanctionEffect} from '../domain/organizations';
import type {GameState} from '../domain/game';

function freeze<T>(x:T):T {if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.freeze(x);Object.values(x).forEach(freeze);}return x;}
const majority:VotingRule={kind:'oneCountryOneVote',threshold:{numerator:1,denominator:2},quorum:{numerator:0,denominator:1},denominator:'presentVoting',comparison:'greaterThan'};
function electorate(ids:string[],weights=ids.map(()=>1),populations=ids.map(()=>100)):ElectorateSnapshot {
 return {eligibleCountryIds:ids,weights:Object.fromEntries(ids.map((id,i)=>[id,weights[i]])),populationByCountry:Object.fromEntries(ids.map((id,i)=>[id,populations[i]])),totalWeight:weights.reduce((a,b)=>a+b,0),totalPopulation:populations.reduce((a,b)=>a+b,0)};
}
const councilIds=[...P5_COUNTRY_IDS,'DEU','TUR','JPN','ITA','CAN','AUS','IND','BRA','ZAF','GRC'];
const councilRule:VotingRule={kind:'securityCouncil',minimumYes:9,vetoCountryIds:[...P5_COUNTRY_IDS],procedural:false};
const admission:FoundationalResolutionPayload={kind:'admission',applicantId:'TUR',tier:'Member'};
const sanction:FoundationalResolutionPayload={kind:'sanctions',targetId:'GRC',durationDays:30,measures:[{scope:'arms',intensity:1,enforcement:.8}],exemptions:[{scope:'food',countryIds:['USA']}]};
const proposeCommand=(payload:FoundationalResolutionPayload=admission):OrganizationCommand=>({type:'organization/proposeResolution',organizationId:'un',bodyId:'plenary',payload});
function ready(rule=majority):GameState {
 const s=makeInitialState();s.playerCountryId='USA';s.council.influenceByCountry={USA:20,FRA:20,DEU:20};s.eventCooldownUntil=10000;s.advisorCooldownUntil=10000;
 const un=s.world.organizations.byId.un;un.bodies.plenary={...un.bodies.plenary,memberIds:['USA','FRA','DEU'],votingRule:structuredClone(rule)};
 un.standingByCountry.USA=10;return recordEconomicHistory(s);
}
function finish(state:GameState,choices:Record<string,'yes'|'no'|'abstain'>={USA:'yes',FRA:'yes',DEU:'yes'}):GameState {
 let s=state;const r=s.world.organizations.resolutions['ORG-1'];
 for(const [id,choice] of Object.entries(choices))s=castBallot(s,r.id,choice,id);
 return processOrganizations({...s,day:r.closesDay});
}

describe('organization voting: Security Council and consensus',()=>{
 it.each([8,9])('%s/15 affirmative votes respects the nine-vote boundary',yes=>{
  const votes=Object.fromEntries(councilIds.map((id,i)=>[id,i<yes?'yes':'abstain'])) as Record<string,'yes'|'abstain'>;
  const outcome=evaluateVotingOutcome(councilRule,electorate(councilIds),votes);expect(outcome.passed).toBe(yes===9);expect(outcome.yesCount).toBe(yes);
 });
 it.each(P5_COUNTRY_IDS)('14/15 yes fails when %s vetoes',id=>{
  const votes=Object.fromEntries(councilIds.map(id=>[id,'yes'])) as Record<string,'yes'|'no'>;votes[id]='no';
  expect(evaluateVotingOutcome(councilRule,electorate(councilIds),votes)).toMatchObject({passed:false,reason:'veto',yesCount:14,noCount:1,vetoedBy:[id]});
 });
 it.each(P5_COUNTRY_IDS)('%s abstention does not veto',id=>{
  const votes=Object.fromEntries(councilIds.map(id=>[id,'yes'])) as Record<string,'yes'|'abstain'>;votes[id]='abstain';
  expect(evaluateVotingOutcome(councilRule,electorate(councilIds),votes)).toMatchObject({passed:true,yesCount:14,abstainCount:1});
 });
 it('ignores vetoes for procedural decisions and reports multiple vetoes deterministically',()=>{
  const votes=Object.fromEntries(councilIds.map(id=>[id,'yes'])) as Record<string,'yes'|'no'>;votes.USA='no';votes.RUS='no';
  expect(evaluateVotingOutcome({...councilRule,procedural:true},electorate(councilIds),votes).passed).toBe(true);
  expect(evaluateVotingOutcome(councilRule,electorate(councilIds),votes).vetoedBy).toEqual(['RUS','USA']);
 });
 it('refuses a malformed council electorate rather than lowering its threshold',()=>{
  expect(evaluateVotingOutcome(councilRule,electorate(councilIds.slice(0,9)),Object.fromEntries(councilIds.slice(0,9).map(id=>[id,'yes']))).passed).toBe(false);
 });
 it('NATO consensus is blocked by one objection and silence is not consent',()=>{
  const r:VotingRule={kind:'consensus',objectionsBlock:true,deadlinePolicy:'expire'},e=electorate(['USA','TUR','FRA']);
  expect(evaluateVotingOutcome(r,e,{USA:'yes',TUR:'yes',FRA:'no'})).toMatchObject({passed:false,reason:'objection'});
  expect(evaluateVotingOutcome(r,e,{USA:'yes',TUR:'yes'})).toMatchObject({passed:false,reason:'incompleteConsensus'});
  expect(evaluateVotingOutcome(r,e,{USA:'yes',TUR:'yes',FRA:'abstain'}).passed).toBe(true);
 });
});
describe('organization voting: quorum, weighted and population thresholds',()=>{
 it('General Assembly requires quorum and rejects ties while excluding abstentions from the cast denominator',()=>{
  const e=electorate(['USA','FRA','DEU','TUR']),r={...majority,quorum:{numerator:3,denominator:4}};
  expect(evaluateVotingOutcome(r,e,{USA:'yes',FRA:'yes'})).toMatchObject({passed:false,reason:'quorum'});
  expect(evaluateVotingOutcome(r,e,{USA:'yes',FRA:'yes',DEU:'abstain'}).passed).toBe(true);
  expect(evaluateVotingOutcome(r,e,{USA:'yes',FRA:'no',DEU:'abstain'}).passed).toBe(false);
  expect(evaluateVotingOutcome({...r,comparison:'atLeast'},e,{USA:'yes',FRA:'no',DEU:'abstain'}).passed).toBe(true);
 });
 it('eligible denominator includes absent/abstaining members and empty votes fail',()=>{
  const e=electorate(['USA','FRA','DEU','TUR']);
  expect(evaluateVotingOutcome({...majority,denominator:'eligible'},e,{USA:'yes',FRA:'yes',DEU:'abstain'}).passed).toBe(false);
  expect(evaluateVotingOutcome(majority,e,{}).passed).toBe(false);expect(evaluateVotingOutcome(majority,electorateEmpty(),{}).passed).toBe(false);
 });
 it('unanimity requires every yes unless the charter explicitly allows abstention',()=>{
  const e=electorate(['USA','FRA','DEU']),r:VotingRule={kind:'unanimity',abstention:'blocks',quorum:{numerator:1,denominator:1}};
  expect(evaluateVotingOutcome(r,e,{USA:'yes',FRA:'yes',DEU:'yes'}).passed).toBe(true);
  expect(evaluateVotingOutcome(r,e,{USA:'yes',FRA:'yes',DEU:'abstain'}).passed).toBe(false);
  expect(evaluateVotingOutcome({...r,abstention:'allowed'},e,{USA:'yes',FRA:'yes',DEU:'abstain'}).passed).toBe(true);
  expect(evaluateVotingOutcome({...r,abstention:'allowed'},e,{USA:'yes',FRA:'no',DEU:'abstain'}).passed).toBe(false);
 });
 it('weighted votes distinguish eligible from cast weight and hit the exact threshold',()=>{
  const e=electorate(['USA','FRA','DEU'],[85,10,5]),r:VotingRule={kind:'weighted',basis:'quota',threshold:{numerator:85,denominator:100},denominator:'eligibleWeight',weightSnapshotId:'quota'};
  expect(evaluateVotingOutcome(r,e,{USA:'yes',FRA:'no',DEU:'abstain'}).passed).toBe(true);
  expect(evaluateVotingOutcome(r,e,{FRA:'yes',DEU:'no'}).passed).toBe(false);
  expect(evaluateVotingOutcome({...r,denominator:'castWeight',threshold:{numerator:2,denominator:3}},e,{FRA:'yes',DEU:'no'}).passed).toBe(true);
 });
 it('cross-multiplies large integer thresholds exactly without storing BigInt values',()=>{
  const total=Number.MAX_SAFE_INTEGER,e=electorate(['USA','FRA'],[4503599627370495,4503599627370496]);
  const r:VotingRule={kind:'weighted',basis:'quota',threshold:{numerator:4503599627370496,denominator:total},denominator:'eligibleWeight',weightSnapshotId:'quota'};
  const outcome=evaluateVotingOutcome(r,e,{USA:'yes',FRA:'no'});expect(outcome.passed).toBe(false);expect(()=>JSON.stringify(outcome)).not.toThrow();
 });
 it('double majority enforces state and population thresholds with the four-country blocking rule',()=>{
  const ids=['USA','FRA','DEU','ITA','TUR','GBR','ESP','POL','GRC','NLD'],e=electorate(ids,undefined,[20,20,20,10,5,5,5,5,5,5]);
  const r:VotingRule={kind:'doubleMajority',states:{numerator:55,denominator:100},population:{numerator:65,denominator:100},blockingMinorityCount:4};
  const vote=(yes:string[])=>Object.fromEntries(ids.map(id=>[id,yes.includes(id)?'yes':'no'])) as Record<string,'yes'|'no'>;
  expect(evaluateVotingOutcome(r,e,vote(ids.slice(0,6))).passed).toBe(true);
  expect(evaluateVotingOutcome(r,e,vote(ids.slice(0,3)))).toMatchObject({passed:false,reason:'stateThreshold'});
  expect(evaluateVotingOutcome(r,e,vote(ids.slice(4)))).toMatchObject({passed:false,reason:'populationThreshold'});
  expect(evaluateVotingOutcome(r,e,vote(ids.slice(3)))).toMatchObject({passed:true,reason:'insufficientBlockingMinority'});
 });
 it('rejects foreign or invalid ballots and inconsistent or non-finite snapshots',()=>{
  const e=electorate(['USA','FRA']);expect(evaluateVotingOutcome(majority,e,{TUR:'yes'}).reason).toBe('invalidBallot');
  expect(evaluateVotingOutcome(majority,e,{USA:'veto'} as unknown as Record<string,'yes'>).passed).toBe(false);
  expect(evaluateVotingOutcome(majority,{...e,totalWeight:NaN},{USA:'yes'}).passed).toBe(false);
  expect(evaluateVotingOutcome(majority,{...e,totalWeight:3},{USA:'yes'}).passed).toBe(false);
  const frozen=freeze(e);expect(evaluateVotingOutcome(freeze(majority),frozen,freeze({USA:'yes'}))).toMatchObject({passed:true});
 });
});
function electorateEmpty(){return electorate([]);}

describe('shared organization command boundary',()=>{
 it.each([admission,sanction])('charges identical player/AI fees for $kind',payload=>{
  const s=ready(),command=proposeCommand(payload),ai=applyOrganizationCommand(freeze(s),command,'USA'),human=applyGameCommand(s,command);
  expect(ai.council).toEqual(human.council);expect(ai.world.organizations).toEqual(human.world.organizations);
  expect(ai.council.influenceByCountry.USA).toBe(payload.kind==='sanctions'?12:15);expect(ai.simulationSeed).toBe(s.simulationSeed);
 });
 it('allows explicit AI proposers under the same membership rules and costs',()=>{
  const s=ready();const n=applyOrganizationCommand(s,proposeCommand(),'FRA');expect(n.council.influenceByCountry.FRA).toBe(15);expect(n.world.organizations.resolutions['ORG-1'].proposerId).toBe('FRA');
 });
 it.each([0,4,NaN])('refuses insufficient/invalid proposal influence %s without consuming the sequence or RNG',value=>{
  const s=ready();s.council.influenceByCountry.USA=value;expect(proposeResolution(s,'un','plenary',admission)).toBe(s);
 });
 it('blocks observers, legacy bodies, protected P5 discipline and unsupported payloads',()=>{
  const s=ready();expect(proposeResolution(s,'imf','plenary',admission)).toBe(s);
  expect(proposeResolution(s,'un','legacyAssembly',admission)).toBe(s);
  expect(proposeResolution(s,'un','plenary',{kind:'membershipDiscipline',targetId:'FRA',action:'expel',grounds:'test'})).toBe(s);
  const invalid={...proposeCommand(),payload:{kind:'finance',borrowerId:'TUR'}} as unknown as OrganizationCommand;
  expect(applyOrganizationCommand(s,invalid)).toBe(s);
 });
 it('freezes voter/weight/population/rule and payload snapshots at proposal time',()=>{
  const s=ready(),payload=structuredClone(admission),n=proposeResolution(freeze(s),'un','plenary',payload),r=n.world.organizations.resolutions['ORG-1'];
  if(payload.kind==='admission')payload.applicantId='GRC';
  expect(r.payload).toEqual(admission);expect(r.electorate.eligibleCountryIds).toEqual(['DEU','FRA','USA']);
  const changed=snapshotGame(n);changed.countries.USA.demographics.population*=2;changed.world.organizations.byId.un.bodies.plenary.memberIds=['USA'];
  expect(changed.world.organizations.resolutions['ORG-1'].electorate).toEqual(r.electorate);
  expect(castBallot(changed,r.id,'yes','FRA').world.organizations.resolutions[r.id].ballots.FRA).toBe('yes');
  expect(castBallot(changed,r.id,'yes','JPN')).toBe(changed);
 });
 it('rejects duplicate proposals, preserves command receipts and allows changing a vote before the deadline',()=>{
  const s=ready(),command={...proposeCommand(),commandId:'proposal-id'},n=applyGameCommand(s,command);
  expect(n.world.commandIds!.filter(id=>id==='proposal-id')).toHaveLength(1);expect(executeCommandResult(n,command).status).toBe('duplicate');
  expect(proposeResolution(n,'un','plenary',admission)).toBe(n);
  const vote={type:'organization/castBallot',resolutionId:'ORG-1',choice:'yes',commandId:'vote-id'} as const;
  const yes=applyGameCommand(n,vote);expect(castBallot(yes,'ORG-1','yes')).toBe(yes);
  const no=castBallot(yes,'ORG-1','no');expect(no.world.organizations.resolutions['ORG-1'].ballots.USA).toBe('no');expect(applyGameCommand(no,vote)).toBe(no);
  expect(castBallot({...no,day:6},'ORG-1','yes').world.organizations.resolutions['ORG-1'].ballots.USA).toBe('no');
 });
 it('refuses inherited body names, invalid nested payload numbers and sequence/date overflow',()=>{
  const s=ready();expect(proposeResolution(s,'un','toString',admission)).toBe(s);
  expect(proposeResolution(s,'un','plenary',{...sanction,durationDays:Number.MAX_SAFE_INTEGER})).toBe(s);
  expect(proposeResolution(s,'un','plenary',{...sanction,measures:[{scope:'arms',intensity:NaN,enforcement:1}]})).toBe(s);
  const collision=snapshotGame(s);collision.world.organizations.nextSequence=Number.MAX_SAFE_INTEGER;
  expect(proposeResolution(collision,'un','plenary',admission)).toBe(collision);
 });
 it('locks quota/GDP weights and refuses missing quota data',()=>{
  const quota:VotingRule={kind:'weighted',basis:'quota',threshold:{numerator:1,denominator:2},denominator:'eligibleWeight',weightSnapshotId:'test'},s=ready(quota);
  expect(proposeResolution(s,'un','plenary',admission)).toBe(s);
  s.world.organizations.byId.un.bodies.plenary.voteWeights={USA:85,FRA:10,DEU:5};const n=proposeResolution(s,'un','plenary',admission);
  expect(n.world.organizations.resolutions['ORG-1'].electorate.totalWeight).toBe(100);
  const g=ready({...quota,basis:'gdp'});const preview=validateOrganizationCommand(g,proposeCommand());expect(preview.allowed).toBe(true);expect(preview.electorate!.weights.USA).toBe(Math.round(g.countries.USA.economy.gdp*1_000_000));
 });
});

describe('organization resolution processing and save invariants',()=>{
 it('adopts an admission once, updates membership/legacy roster and records standing',()=>{
  const n=finish(proposeResolution(ready(),'un','plenary',admission));
  expect(n.world.organizations.resolutions['ORG-1']).toMatchObject({phase:'adopted',execution:{status:'applied'},outcome:{passed:true}});
  expect(n.world.organizations.byId.un.memberships.TUR.tier).toBe('Member');expect(n.world.members.un).toContain('TUR');
  expect(n.world.organizations.byId.un.standingByCountry.USA).toBe(12);expect(processOrganizations(n)).toBe(n);expect(canLoadSave(n)).toBe(true);
  expect(processOrganizations({...n,day:7}).world.organizations.byId.un.standingByCountry.USA).toBe(12);
 });
 it('admits observers without giving voting seats or legacy membership benefits',()=>{
  const n=finish(proposeResolution(ready(),'un','plenary',{...admission,tier:'Observer'}));
  expect(n.world.organizations.byId.un.memberships.TUR.tier).toBe('Observer');expect(n.world.organizations.byId.un.bodies.plenary.memberIds).not.toContain('TUR');expect(n.world.members.un).not.toContain('TUR');expect(canLoadSave(n)).toBe(true);
 });
 it.each(['suspend','expel'] as const)('%s applies membership discipline and mirrors the UN legacy roster',action=>{
  const s=ready();const n=finish(proposeResolution(s,'un','plenary',{kind:'membershipDiscipline',targetId:'DEU',action,grounds:'test'}));
  if(action==='suspend')expect(n.world.organizations.byId.un.memberships.DEU.status).toBe('suspended');else expect(n.world.organizations.byId.un.memberships.DEU).toBeUndefined();
  expect(n.world.members.un).not.toContain('DEU');expect(canLoadSave(n)).toBe(true);
 });
 it('rejected votes keep targets unchanged and spend influence only once',()=>{
  const s=ready(),n=finish(proposeResolution(s,'un','plenary',admission),{USA:'yes',FRA:'no',DEU:'no'});
  expect(n.world.organizations.resolutions['ORG-1']).toMatchObject({phase:'rejected',outcome:{passed:false,reason:'threshold'}});
  expect(n.world.organizations.byId.un.memberships.TUR).toBeUndefined();expect(n.world.organizations.byId.un.standingByCountry.USA).toBe(9);expect(n.council.influenceByCountry.USA).toBe(15);
 });
 it('creates and expires one typed sanction record without turning it into an unscoped global embargo',()=>{
  const n=finish(proposeResolution(ready(),'un','plenary',sanction)),r=n.world.organizations.resolutions['ORG-1'],id=r.execution.effectIds[0];
  const e=n.world.organizations.effects[id] as OrganizationSanctionEffect;
  expect(e).toMatchObject({kind:'organizationSanctions',sourceResolutionId:r.id,startsDay:6,endsDay:36,status:'active',targetId:'GRC'});expect(e.measures).toEqual(sanction.measures);
  expect(n.countries.GRC.globalSanctions).not.toBe(true);expect(canLoadSave(n)).toBe(true);
  const loaded=migrateSave(JSON.parse(JSON.stringify(snapshotGame(n))))!;expect(processOrganizations(loaded)).toBe(loaded);
  const expired=processOrganizations({...loaded,day:36});expect(expired.world.organizations.effects[id]).toMatchObject({status:'expired'});expect(canLoadSave(expired)).toBe(true);
  expect(Object.keys(expired.world.organizations.effects)).toEqual([id]);
 });
 it('adopts at the deadline but executes only at the effective day',()=>{
  let s=proposeResolution(ready(),'un','plenary',admission);s.world.organizations.resolutions['ORG-1'].effectiveDay=8;
  s=finish(s);expect(s.world.organizations.resolutions['ORG-1'].phase).toBe('adopted');expect(s.world.organizations.resolutions['ORG-1'].execution.status).toBe('pending');
  const n=processOrganizations({...s,day:8});expect(n.world.organizations.resolutions['ORG-1'].execution.status).toBe('applied');expect(n.world.organizations.byId.un.standingByCountry.USA).toBe(12);
 });
 it('marks a formerly valid target failure explicitly and refuses replaying an effect collision',()=>{
  let s=proposeResolution(ready(),'un','plenary',admission);s.countries.TUR.annexedBy='FRA';s=finish(s);
  expect(s.world.organizations.resolutions['ORG-1']).toMatchObject({phase:'failed',execution:{status:'failed',reason:'invalidTarget'}});
 });
 it('does not overwrite an existing effect with a colliding ID',()=>{
  const s=proposeResolution(ready(),'un','plenary',sanction);
  s.world.organizations.effects['sanction:ORG-1']={id:'sanction:ORG-1',kind:'legacySanctions',issuer:'legacyCouncil',targetId:'GRC',startsDay:1,endsDay:365,status:'active'};
  const n=finish(s);expect(n.world.organizations.resolutions['ORG-1']).toMatchObject({phase:'failed',execution:{reason:'effectCollision'}});
  expect(n.world.organizations.effects['sanction:ORG-1']).toEqual(s.world.organizations.effects['sanction:ORG-1']);expect(canLoadSave(n)).toBe(true);
 });
 it('NATO admission uses its actual consensus charter and a single member objection blocks it',()=>{
  let s=makeInitialState();s.council.influenceByCountry.TUR=20;s=proposeResolution(s,'nato','plenary',{kind:'admission',applicantId:'JPN',tier:'Member'});
  const r=s.world.organizations.resolutions['ORG-1'];expect(r.ruleSnapshot.kind).toBe('consensus');
  for(const id of r.electorate.eligibleCountryIds)s=castBallot(s,r.id,id==='USA'?'no':'yes',id);
  const n=processOrganizations({...s,day:r.closesDay});expect(n.world.organizations.resolutions[r.id]).toMatchObject({phase:'rejected',outcome:{reason:'objection'}});
  expect(n.world.organizations.byId.nato.memberships.JPN).toBeUndefined();expect(canLoadSave(n)).toBe(true);
 });
 it('Security Council commands freeze fifteen seats and retain a P5 veto on execution',()=>{
  let s=ready();s=proposeResolution(s,'un','securityCouncil',sanction);const r=s.world.organizations.resolutions['ORG-1'];expect(r.electorate.eligibleCountryIds).toHaveLength(15);
  for(const id of r.electorate.eligibleCountryIds)s=castBallot(s,r.id,id==='RUS'?'no':'yes',id);
  const n=processOrganizations({...s,day:r.closesDay});expect(n.world.organizations.resolutions[r.id]).toMatchObject({phase:'rejected',outcome:{reason:'veto',vetoedBy:['RUS']}});expect(n.world.organizations.effects).toEqual({});
 });
 it('reconciles completed legacy memberships without promoting non-P5 countries',()=>{
  let s=makeInitialState();s.countries.TUR.politics.stability=80;s.countries.TUR.diplomacy.reputation=80;s.council.influenceByCountry.TUR=80;
  s=applyMembership(s,'un');s.world.ballots[0].votes={USA:'yes'};
  const n=processWorldInstitutions({...s,day:6});expect(n.world.organizations.byId.un.memberships.TUR.tier).toBe('Member');expect(n.world.organizations.byId.un.bodies.plenary.memberIds).toContain('TUR');expect(canLoadSave(n)).toBe(true);
 });
 it('threads AI RNG once, uses the shared vote validator, and respects the closing deadline',()=>{
  const s=proposeResolution(freeze(ready()),'un','plenary',admission),a=processOrganizationAiVotes(freeze(s)),b=processOrganizationAiVotes(s);
  expect(a).toEqual(b);expect(a.simulationSeed).not.toBe(s.simulationSeed);expect(a.world.organizations.resolutions['ORG-1'].ballots.USA).toBeUndefined();
  expect(processOrganizationAiVotes(a)).toBe(a);
  const closed={...s,day:6};expect(processOrganizationAiVotes(closed)).toBe(closed);
 });
 it('integrates deadline execution into tickGame and replays identically after save/load without mutating input',()=>{
  let s=proposeResolution(ready(),'un','plenary',sanction);
  for(const id of ['USA','FRA','DEU'])s=castBallot(s,'ORG-1','yes',id);
  s={...s,day:5};const loaded=migrateSave(snapshotGame(s))!;freeze(s);
  const a=tickGame(s),b=tickGame(loaded);expect(a).toEqual(b);expect(a.world.organizations.resolutions['ORG-1'].execution.status).toBe('applied');expect(canLoadSave(snapshotGame(a))).toBe(true);
 });
});
