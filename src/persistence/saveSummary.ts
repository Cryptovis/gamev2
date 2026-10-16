import {demoOwner} from '../session/demoAccounts';
import {db} from './database';
import {CURRENT_SCHEMA_VERSION,OLDEST_SUPPORTED_SCHEMA} from './migrations';

// A cheap look at the newest save for the landing screen's Continue card. It reads the stored envelope and a handful
// of fields. It never migrates, validates the whole state, hydrates the store or runs the simulation, and it writes
// nothing. "ready" therefore means the newest save looks loadable, not that Continue is guaranteed to succeed:
// a deeper problem still surfaces as a failed load, which the landing state machine handles.

export interface SaveSummary {
  slotId:string;
  countryId:string;
  countryName:string;
  /** ISO 3166-1 alpha-2, used for the flag. Empty when the save does not carry one. */
  iso2:string;
  leaderName:string;
  campaignDay:number;
  /** Calendar date of the campaign day, YYYY-MM-DD. */
  campaignDateIso:string;
  /** When the save was written, in epoch milliseconds. */
  savedAt:number;
}
export type SaveUnreadableReason='corrupt'|'incompatible_version';
export type SaveSummaryState=
  |{status:'loading'}
  |{status:'none'}
  |{status:'ready';summary:SaveSummary}
  |{status:'unreadable';reason:SaveUnreadableReason};

export const SAVE_SUMMARY_LOADING:SaveSummaryState={status:'loading'};

/**
 * Same value as CAMPAIGN_START_DATE in the engine's leadership module. It is repeated here so persistence code does not
 * import the engine; a test compares the two. Saves from before the leadership state existed fall back to it.
 */
const DEFAULT_CAMPAIGN_START='2026-01-01';

type Loose=Record<string,unknown>;
const isObject=(value:unknown):value is Loose=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const isDateText=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);

/** Calendar date of a campaign day (day 1 is the start date). Returns null if the result is not a real date. */
export function campaignDateIso(startIso:string,day:number):string|null {
  if(!isDateText(startIso)||!Number.isInteger(day))return null;
  const date=new Date(startIso+'T00:00:00Z');
  if(!Number.isFinite(date.getTime()))return null;
  date.setUTCDate(date.getUTCDate()+day-1);
  return Number.isFinite(date.getTime())?date.toISOString().slice(0,10):null;
}

type Outcome={ok:true;summary:SaveSummary}|{ok:false;reason:SaveUnreadableReason};
const corrupt:Outcome={ok:false,reason:'corrupt'};

/** Reads one stored record. Anything unexpected is reported as corrupt rather than thrown. */
export function summarizeSaveRecord(record:unknown):Outcome {
  if(!isObject(record)||typeof record.id!=='string'||!Number.isFinite(record.updatedAt)||!isObject(record.state))return corrupt;
  const state=record.state;
  const version=state.schemaVersion;
  if(!Number.isInteger(version))return corrupt;
  if((version as number)<OLDEST_SUPPORTED_SCHEMA||(version as number)>CURRENT_SCHEMA_VERSION)return {ok:false,reason:'incompatible_version'};
  const day=state.day;
  if(!Number.isInteger(day)||(day as number)<1)return corrupt;
  const countryId=state.playerCountryId;
  const countries=state.countries;
  const country=typeof countryId==='string'&&isObject(countries)?countries[countryId]:undefined;
  if(!isObject(country)||typeof country.name!=='string')return corrupt;
  const profile=state.playerProfile;
  if(!isObject(profile)||typeof profile.commanderName!=='string')return corrupt;
  const leadership=state.leadership;
  const start=isObject(leadership)&&isDateText(leadership.campaignStartDate)?leadership.campaignStartDate:DEFAULT_CAMPAIGN_START;
  const dateIso=campaignDateIso(start,day as number);
  if(dateIso===null)return corrupt;
  return {ok:true,summary:{
    slotId:record.id,
    countryId:countryId as string,
    countryName:country.name,
    iso2:typeof country.iso2==='string'?country.iso2:'',
    leaderName:profile.commanderName,
    campaignDay:day as number,
    campaignDateIso:dateIso,
    savedAt:record.updatedAt as number,
  }};
}

/**
 * Summary of the newest readable save that belongs to owner. Records with a different owner are ignored, as they are
 * for Continue. When saves exist but none can be read, the reason comes from the newest one.
 */
export function summarizeSaveRecords(records:readonly unknown[],owner:string):SaveSummaryState {
  const updated=(record:unknown)=>(isObject(record)&&Number.isFinite(record.updatedAt)?record.updatedAt as number:-Infinity);
  const mine=records
    .filter(record=>isObject(record)&&(record.owner??'guest')===owner)
    .sort((a,b)=>updated(b)-updated(a));
  if(mine.length===0)return {status:'none'};
  let firstFailure:SaveUnreadableReason|null=null;
  for(const record of mine){
    const outcome=summarizeSaveRecord(record);
    if(outcome.ok)return {status:'ready',summary:outcome.summary};
    firstFailure??=outcome.reason;
  }
  return {status:'unreadable',reason:firstFailure??'corrupt'};
}

/**
 * Looks at saved campaigns for the given profile, or for the current demo session when none is given.
 * Uses the same table read as Continue. A storage failure is reported as unreadable instead of being thrown.
 */
export async function peekMostRecentSaveSummary(profileId?:string):Promise<SaveSummaryState> {
  try {
    const records=await db.saves.orderBy('updatedAt').reverse().toArray();
    return summarizeSaveRecords(records,profileId??demoOwner());
  } catch(error) {
    console.warn('Could not read saved campaigns:',error);
    return {status:'unreadable',reason:'corrupt'};
  }
}
