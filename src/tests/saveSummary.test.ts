import {describe,it,expect,beforeEach,vi} from 'vitest';
// Vitest runs in Node without IndexedDB, so the Dexie database is replaced by an in-memory table with the calls the peek uses.
vi.mock('../persistence/database',()=>{
 type Row={id:string;updatedAt:number;[key:string]:unknown};
 const rows=new Map<string,Row>();
 const sorted=()=>[...rows.values()].sort((a,b)=>Number(a.updatedAt)-Number(b.updatedAt));
 const writes={count:0};
 const saves={
  clear:async()=>{rows.clear();writes.count=0;},
  put:async(row:Row)=>{writes.count++;rows.set(row.id,row);return row.id;},
  orderBy:(_key:string)=>({reverse:()=>({toArray:async()=>sorted().reverse()})}),
  failNextRead:false,
 };
 const original=saves.orderBy;
 saves.orderBy=(key:string)=>{if(saves.failNextRead){saves.failNextRead=false;throw new Error('IndexedDB is blocked');}return original(key);};
 return {db:{saves,writes}};
});
import {makeInitialState} from '../data/initialState';
import {snapshotGame} from '../persistence/snapshot';
import {CURRENT_SCHEMA_VERSION,OLDEST_SUPPORTED_SCHEMA} from '../persistence/migrations';
import {CAMPAIGN_START_DATE,gameDate} from '../engine/systems/leadership';
import {db} from '../persistence/database';
import {campaignDateIso,peekMostRecentSaveSummary,summarizeSaveRecord,summarizeSaveRecords,SAVE_SUMMARY_LOADING} from '../persistence/saveSummary';
import type {GameState} from '../domain/game';

type Loose=Record<string,unknown>;
const stateAt=(day:number,commanderName='Ada Lovelace')=>{
 const state=makeInitialState();
 state.day=day;
 state.playerProfile={...state.playerProfile,commanderName};
 return state;
};
const record=(state:GameState,updatedAt:number,extra:Loose={})=>({id:`manual-${updatedAt}`,name:'Manual Save',owner:'guest',updatedAt,schemaVersion:state.schemaVersion,state:snapshotGame(state),...extra});
const withState=(base:ReturnType<typeof record>,patch:Loose)=>({...base,state:{...base.state,...patch}});
const reasonOf=(value:unknown)=>{const outcome=summarizeSaveRecord(value);return outcome.ok?'ok':outcome.reason;};

describe('campaignDateIso',()=>{
 it('counts day 1 as the start date and rolls over months, years and leap days',()=>{
  expect(campaignDateIso('2026-01-01',1)).toBe('2026-01-01');
  expect(campaignDateIso('2026-01-01',32)).toBe('2026-02-01');
  expect(campaignDateIso('2026-01-01',366)).toBe('2027-01-01');
  expect(campaignDateIso('2028-02-28',2)).toBe('2028-02-29');
  expect(campaignDateIso('2028-02-28',3)).toBe('2028-03-01');
 });
 it('returns null for a bad start date, a fractional day or a day too large to be a date',()=>{
  expect(campaignDateIso('2026-13-45',1)).toBeNull();
  expect(campaignDateIso('01/01/2026',1)).toBeNull();
  expect(campaignDateIso('2026-01-01',1.5)).toBeNull();
  expect(campaignDateIso('2026-01-01',1e12)).toBeNull();
 });
 it('agrees with the engine for the same campaign day, so the two cannot drift apart',()=>{
  for(const day of [1,2,45,365,366,400,1200]){
   const state=stateAt(day);
   expect(campaignDateIso(state.leadership.campaignStartDate,day),`day ${day}`).toBe(gameDate(state));
  }
 });
});

describe('summarizeSaveRecord',()=>{
 it('reads country, leader, day, date and save time from a valid save',()=>{
  const state=stateAt(45);
  const outcome=summarizeSaveRecord(record(state,1_700_000_000_000));
  expect(outcome.ok).toBe(true);
  if(!outcome.ok)return;
  const country=state.countries[state.playerCountryId];
  expect(outcome.summary).toEqual({
   slotId:'manual-1700000000000',countryId:state.playerCountryId,countryName:country.name,iso2:country.iso2,
   leaderName:'Ada Lovelace',campaignDay:45,campaignDateIso:gameDate(state),savedAt:1_700_000_000_000,
  });
 });
 it('falls back to the default campaign start for a save without leadership state or with an unusable start date',()=>{
  const base=record(stateAt(10),5);
  for(const leadership of [undefined,null,{campaignStartDate:'not a date'},{campaignStartDate:20260101}]){
   const outcome=summarizeSaveRecord(withState(base,{leadership}));
   expect(outcome.ok).toBe(true);
   if(outcome.ok)expect(outcome.summary.campaignDateIso).toBe(campaignDateIso(CAMPAIGN_START_DATE,10));
  }
 });
 it('accepts an empty leader name and a country without a flag code',()=>{
  const state=stateAt(3,'');
  const base=record(state,5);
  const countries={...base.state.countries,[state.playerCountryId]:{...base.state.countries[state.playerCountryId],iso2:undefined}};
  const outcome=summarizeSaveRecord(withState(base,{countries}));
  expect(outcome.ok).toBe(true);
  if(outcome.ok){expect(outcome.summary.leaderName).toBe('');expect(outcome.summary.iso2).toBe('');}
 });
 it('reports corrupt for anything that is not a usable record',()=>{
  const base=record(stateAt(10),5);
  const cases:[string,unknown][]=[
   ['null',null],['a string','save'],['an array',[]],['no id',{...base,id:undefined}],['numeric id',{...base,id:7}],
   ['no updatedAt',{...base,updatedAt:undefined}],['NaN updatedAt',{...base,updatedAt:NaN}],
   ['state null',{...base,state:null}],['state text',{...base,state:'x'}],['state array',{...base,state:[]}],
   ['no schema version',withState(base,{schemaVersion:undefined})],['fractional schema',withState(base,{schemaVersion:18.5})],
   ['day zero',withState(base,{day:0})],['negative day',withState(base,{day:-4})],['day text',withState(base,{day:'10'})],
   ['fractional day',withState(base,{day:2.5})],['huge day',withState(base,{day:1e12})],
   ['no country id',withState(base,{playerCountryId:undefined})],['unknown country',withState(base,{playerCountryId:'ZZZ'})],
   ['countries missing',withState(base,{countries:undefined})],['country not an object',withState(base,{countries:{[base.state.playerCountryId]:'x'}})],
   ['country without a name',withState(base,{countries:{[base.state.playerCountryId]:{iso2:'US'}}})],
   ['no profile',withState(base,{playerProfile:undefined})],['commander not text',withState(base,{playerProfile:{commanderName:42}})],
  ];
  for(const [label,value] of cases)expect(reasonOf(value),label).toBe('corrupt');
 });
 it('reports an incompatible version when the schema is older than supported or newer than this game',()=>{
  const base=record(stateAt(10),5);
  expect(reasonOf(withState(base,{schemaVersion:OLDEST_SUPPORTED_SCHEMA-1}))).toBe('incompatible_version');
  expect(reasonOf(withState(base,{schemaVersion:1}))).toBe('incompatible_version');
  expect(reasonOf(withState(base,{schemaVersion:CURRENT_SCHEMA_VERSION+1}))).toBe('incompatible_version');
  expect(reasonOf(withState(base,{schemaVersion:OLDEST_SUPPORTED_SCHEMA}))).toBe('ok');
  expect(reasonOf(withState(base,{schemaVersion:CURRENT_SCHEMA_VERSION}))).toBe('ok');
 });
});

describe('summarizeSaveRecords',()=>{
 it('is none when there are no records or none belong to the owner',()=>{
  expect(summarizeSaveRecords([],'guest')).toEqual({status:'none'});
  expect(summarizeSaveRecords([record(stateAt(5),1,{owner:'alice'})],'guest')).toEqual({status:'none'});
 });
 it('picks the newest record regardless of input order and ignores other owners',()=>{
  const records=[record(stateAt(5),100),record(stateAt(9),300),record(stateAt(7),200),record(stateAt(99),999,{owner:'alice'})];
  for(const ordered of [records,[...records].reverse()]){
   const result=summarizeSaveRecords(ordered,'guest');
   expect(result.status).toBe('ready');
   if(result.status==='ready')expect(result.summary.campaignDay).toBe(9);
  }
  const alice=summarizeSaveRecords(records,'alice');
  expect(alice.status==='ready'&&alice.summary.campaignDay).toBe(99);
 });
 it('treats a record without an owner as a guest save, as Continue does',()=>{
  const {owner:_owner,...legacy}=record(stateAt(12),50);
  expect(summarizeSaveRecords([legacy],'guest').status).toBe('ready');
  expect(summarizeSaveRecords([legacy],'alice').status).toBe('none');
 });
 it('skips an unreadable newest save and describes the next readable one',()=>{
  const broken=withState(record(stateAt(20),500),{day:0});
  const result=summarizeSaveRecords([broken,record(stateAt(8),100)],'guest');
  expect(result.status==='ready'&&result.summary.campaignDay).toBe(8);
 });
 it('is unreadable, with the newest save\'s reason, when no save can be read',()=>{
  const newestTooNew=withState(record(stateAt(20),500),{schemaVersion:CURRENT_SCHEMA_VERSION+1});
  const olderCorrupt=withState(record(stateAt(8),100),{day:0});
  expect(summarizeSaveRecords([olderCorrupt,newestTooNew],'guest')).toEqual({status:'unreadable',reason:'incompatible_version'});
  expect(summarizeSaveRecords([newestTooNew,olderCorrupt].reverse(),'guest')).toEqual({status:'unreadable',reason:'incompatible_version'});
  expect(summarizeSaveRecords([olderCorrupt],'guest')).toEqual({status:'unreadable',reason:'corrupt'});
 });
 it('does not modify the records it reads',()=>{
  const records=[record(stateAt(5),100),withState(record(stateAt(6),200),{day:0})];
  const before=JSON.stringify(records);
  summarizeSaveRecords(records,'guest');
  expect(JSON.stringify(records)).toBe(before);
 });
 it('exposes a loading placeholder for the state before the first read',()=>expect(SAVE_SUMMARY_LOADING).toEqual({status:'loading'}));
});

describe('peekMostRecentSaveSummary',()=>{
 beforeEach(async()=>{await db.saves.clear();});
 it('is none when nothing is saved',async()=>expect(await peekMostRecentSaveSummary()).toEqual({status:'none'}));
 it('reads the newest guest save for the current session by default and writes nothing',async()=>{
  await db.saves.put(record(stateAt(4),100) as never);await db.saves.put(record(stateAt(11),200) as never);
  const writesBefore=(db as unknown as {writes:{count:number}}).writes.count;
  const result=await peekMostRecentSaveSummary();
  expect(result.status==='ready'&&result.summary.campaignDay).toBe(11);
  expect((db as unknown as {writes:{count:number}}).writes.count).toBe(writesBefore);
 });
 it('reads another profile when one is given',async()=>{
  await db.saves.put(record(stateAt(4),100) as never);await db.saves.put(record(stateAt(30),50,{owner:'alice'}) as never);
  const alice=await peekMostRecentSaveSummary('alice');
  expect(alice.status==='ready'&&alice.summary.campaignDay).toBe(30);
  expect(await peekMostRecentSaveSummary('bob')).toEqual({status:'none'});
 });
 it('reports unreadable instead of throwing when storage fails',async()=>{
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  (db.saves as unknown as {failNextRead:boolean}).failNextRead=true;
  expect(await peekMostRecentSaveSummary()).toEqual({status:'unreadable',reason:'corrupt'});
  expect(warn).toHaveBeenCalled();
  warn.mockRestore();
 });
});
