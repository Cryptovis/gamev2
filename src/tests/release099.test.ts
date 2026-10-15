import {describe,it,expect} from 'vitest';
import {version} from '../../package.json';
import {makeInitialState} from '../data/initialState';
import {CURRENT_SCHEMA_VERSION,canLoadSave,migrateSave} from '../persistence/migrations';
import {snapshotGame} from '../persistence/snapshot';
import {useGameStore} from '../store/gameStore';
import {ORGANIZATION_IDS,P5_COUNTRY_IDS,type Resolution,type ResolutionPayload,type VotingRule} from '../domain/organizations';

const majority:VotingRule={kind:'oneCountryOneVote',threshold:{numerator:1,denominator:2},quorum:{numerator:0,denominator:1},denominator:'presentVoting'};
function proposal(payload:ResolutionPayload,ruleSnapshot=majority):Resolution {
  return {id:'ORG-1',organizationId:'un',bodyId:'plenary',proposerId:'USA',payload,phase:'voting',
    openedDay:1,closesDay:5,effectiveDay:6,ruleSnapshot,
    electorate:{eligibleCountryIds:['USA','FRA'],weights:{USA:1,FRA:1},populationByCountry:{USA:100,FRA:100},totalWeight:2,totalPopulation:200},
    ballots:{USA:'yes'},execution:{status:'pending',effectIds:[]}};
}
const payloads:ResolutionPayload[]=[
  {kind:'admission',applicantId:'TUR',tier:'Observer'},
  {kind:'membershipDiscipline',targetId:'TUR',action:'suspend',grounds:'arrears'},
  {kind:'sanctions',targetId:'TUR',measures:[{scope:'arms',intensity:1,enforcement:.5}],durationDays:30,exemptions:[{scope:'food',countryIds:['USA']}]},
  {kind:'finance',borrowerId:'TUR',programId:'emergency',principalB:1,terms:{apr:3,termDays:365,graceDays:30,denomination:'SDR'},conditions:[{kind:'fiscalBalance',threshold:0,reviewDay:30}]},
  {kind:'oilQuota',quotas:{SAU:100},durationDays:30},
  {kind:'defenseResponse',incidentId:'incident-1',commitments:[{countryId:'USA',personnel:100,equipmentB:1,fundingB:1,readyDay:10}]},
  {kind:'peacekeeping',conflictId:'war-1',mandate:{countryIds:['USA','TUR'],personnel:100,fundingB:1,durationDays:30,consentRequired:true}},
  {kind:'tradeRemedy',disputeId:'case-1',remedy:{targetId:'TUR',commodity:'steel',tariffRate:.2,maximumValueB:1,durationDays:30}},
  {kind:'investmentCompact',commitments:[{countryId:'USA',amountB:1,readyDay:10}]},
  {kind:'marketIntegration',agreement:{countryIds:['USA','TUR'],tariffReduction:.1,freeMovement:true,durationDays:365}},
  {kind:'localCurrencySwap',agreement:{countryA:'USA',countryB:'TUR',limitB:1,durationDays:30}},
];

describe('0.99 release and strict organization contracts',()=>{
  it('publishes 1.0.0 on Schema 18 with all 14 organizations and P5 bodies',()=>{
    const s=makeInitialState();expect(version).toBe('1.0.0');expect(CURRENT_SCHEMA_VERSION).toBe(18);expect(s.schemaVersion).toBe(18);
    expect(Object.keys(s.world.organizations.byId).sort()).toEqual([...ORGANIZATION_IDS].sort());
    expect(s.world.organizations.byId.un.bodies.securityCouncil.permanentMemberIds.sort()).toEqual([...P5_COUNTRY_IDS].sort());
    expect(canLoadSave(snapshotGame(s))).toBe(true);
  });
  it('creates independent organization records for new and reset campaigns',()=>{
    const a=makeInitialState(),b=makeInitialState();a.world.organizations.byId.nato.availableFundsB=10;
    expect(b.world.organizations.byId.nato.availableFundsB).toBe(0);
    useGameStore.getState().startCampaign({commanderName:'Schema 18',countryId:'USA',avatarId:'avatar-01',language:'en'});
    const s=useGameStore.getState();expect(s.schemaVersion).toBe(18);expect(canLoadSave(snapshotGame(s))).toBe(true);
    expect(s.world.organizations.byId.un.memberships.USA.tier).toBe('PermanentCouncil');
    expect(s.world.members.un).not.toContain('USA');useGameStore.getState().resetGame();
  });
  it.each(payloads.map(payload=>[payload.kind,payload] as const))('roundtrips a fully typed %s resolution',(kind,payload)=>{
    const s=makeInitialState();s.world.organizations.resolutions['ORG-1']=proposal(payload);s.world.organizations.nextSequence=2;
    expect(canLoadSave(s)).toBe(true);
    expect(migrateSave(JSON.parse(JSON.stringify(snapshotGame(s))))!.world.organizations.resolutions['ORG-1'].payload).toEqual(payload);
  });
  it.each([
    majority,
    {kind:'securityCouncil',minimumYes:9,vetoCountryIds:['USA','FRA'],procedural:false},
    {kind:'weighted',basis:'quota',threshold:{numerator:85,denominator:100},denominator:'eligibleWeight',weightSnapshotId:'quota-1'},
    {kind:'consensus',objectionsBlock:true,deadlinePolicy:'expire'},
    {kind:'unanimity',abstention:'allowed',quorum:{numerator:1,denominator:1}},
    {kind:'doubleMajority',states:{numerator:55,denominator:100},population:{numerator:65,denominator:100},blockingMinorityCount:4},
  ] satisfies VotingRule[])('accepts a %s voting rule snapshot',rule=>{
    const s=makeInitialState();s.world.organizations.resolutions['ORG-1']=proposal(payloads[0],rule);expect(canLoadSave(s)).toBe(true);
  });
  it('preserves a permanent member that also holds the Chair office',()=>{
    const s=makeInitialState(),france=s.world.organizations.byId.un.memberships.FRA;
    france.offices=[{role:'Chair',bodyId:'securityCouncil',untilDay:30}];
    const loaded=migrateSave(snapshotGame(s))!;
    expect(loaded.world.organizations.byId.un.memberships.FRA).toEqual(france);
  });
  it.each([
    ['missing organization',(s:ReturnType<typeof makeInitialState>)=>{delete (s.world.organizations.byId as Partial<typeof s.world.organizations.byId>).nato;}],
    ['missing required container',(s:ReturnType<typeof makeInitialState>)=>{delete (s.world as Partial<typeof s.world>).organizations;}],
    ['unknown organization',(s:ReturnType<typeof makeInitialState>)=>{Object.assign(s.world.organizations.byId,{unknown:s.world.organizations.byId.nato});}],
    ['incorrect organization identity',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.nato.id='un';}],
    ['non-finite funds',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.nato.availableFundsB=NaN;}],
    ['negative arrears',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.nato.memberships.USA.duesArrearsB=-1;}],
    ['future joining day',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.nato.memberships.USA.joinedDay=2;}],
    ['unknown chair body',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.un.memberships.USA.offices=[{role:'Chair',bodyId:'missing',untilDay:30}];}],
    ['Chair as a tier',(s:ReturnType<typeof makeInitialState>)=>{Object.assign(s.world.organizations.byId.un.memberships.USA,{tier:'Chair'});}],
    ['missing P5 seat',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.un.bodies.securityCouncil.permanentMemberIds=[];}],
    ['missing veto privileges',(s:ReturnType<typeof makeInitialState>)=>{const rule=s.world.organizations.byId.un.bodies.securityCouncil.votingRule;if(rule.kind==='securityCouncil')rule.vetoCountryIds=[];}],
    ['unknown standing country',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.byId.un.standingByCountry.unknown=1;}],
    ['future processing day',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.lastProcessedDay=2;}],
    ['opaque effect',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.effects.bad={};}],
    ['opaque financing',(s:ReturnType<typeof makeInitialState>)=>{s.world.organizations.financing.bad={amountB:NaN};}],
  ])('rejects %s',(name,corrupt)=>{
    const s=makeInitialState();corrupt(s);expect(canLoadSave(s)).toBe(false);expect(migrateSave(s)).toBeNull();
  });
  it.each([
    ['unknown target',(r:Resolution)=>{r.payload={kind:'admission',applicantId:'unknown',tier:'Member'};}],
    ['unknown body',(r:Resolution)=>{r.bodyId='unknown';}],
    ['foreign voter',(r:Resolution)=>{r.ballots.TUR='yes';}],
    ['invalid choice',(r:Resolution)=>{Object.assign(r.ballots,{USA:'veto'});}],
    ['inconsistent electorate total',(r:Resolution)=>{r.electorate.totalWeight=9;}],
    ['duplicate voter',(r:Resolution)=>{r.electorate.eligibleCountryIds.push('USA');}],
    ['NaN weight',(r:Resolution)=>{r.electorate.weights.USA=NaN;}],
    ['bad rational denominator',(r:Resolution)=>{r.ruleSnapshot={kind:'oneCountryOneVote',threshold:{numerator:1,denominator:0},quorum:{numerator:0,denominator:1},denominator:'eligible'};}],
    ['unknown resolution field',(r:Resolution)=>{Object.assign(r,{extra:true});}],
    ['missing effect',(r:Resolution)=>{r.execution={status:'applied',effectIds:['missing']};}],
  ])('rejects resolution with %s',(name,corrupt)=>{
    const s=makeInitialState(),r=proposal(payloads[0]);corrupt(r);s.world.organizations.resolutions['ORG-1']=r;
    expect(canLoadSave(s)).toBe(false);
  });
});
