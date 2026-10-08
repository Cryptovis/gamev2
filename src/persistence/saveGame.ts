import {demoOwner} from '../session/demoAccounts';
import type { GameState } from '../domain/game';
import { db, type SaveRecord } from './database';

import { snapshotGame } from './snapshot';
import { migrateSave, canLoadSave } from './migrations';
const scopedId=(id:string,owner=demoOwner())=>owner==='guest'||id.startsWith(owner+':')?id:owner+':'+id;
const owned=(record:SaveRecord,owner=demoOwner())=> (record.owner??'guest')===owner;
/** Autosaves are keyed per campaign so a new campaign never overwrites another campaign's checkpoint. */
export const AUTOSAVE_LIMIT=5;
export const autosaveId=(campaignId?:string)=>campaignId?`autosave:${campaignId}`:'autosave';
const isAutosave=(record:SaveRecord)=>{const id=record.owner&&record.owner!=='guest'&&record.id.startsWith(record.owner+':')?record.id.slice(record.owner.length+1):record.id;return id==='autosave'||id.startsWith('autosave:');};
export async function saveGame(state: GameState, id = 'manual', name = 'Manual Save',owner=demoOwner()) {
  const snapshot=snapshotGame(state);
  // Never replace a good save with one that could not be loaded back.
  if(!canLoadSave(snapshot))throw new Error(`Refusing to write invalid save "${id}" (schema ${state.schemaVersion})`);
  const record: SaveRecord = { id:scopedId(id,owner), owner, name, updatedAt: Date.now(), schemaVersion: state.schemaVersion, state: snapshot };
  await db.saves.put(record);
  if(isAutosave(record))await pruneAutosaves(owner);
  return record;
}

/** Keeps the newest AUTOSAVE_LIMIT autosave records (legacy `autosave` included) for one owner. Reads keys only, not save bodies. */
export async function pruneAutosaves(owner=demoOwner(),limit=AUTOSAVE_LIMIT) {
  const prefix=owner==='guest'?'':owner+':';
  const keys=(await db.saves.orderBy('updatedAt').reverse().primaryKeys()) as string[];
  const stale=keys.filter(id=>{if(!id.startsWith(prefix))return false;const local=id.slice(prefix.length);return local==='autosave'||local.startsWith('autosave:');}).slice(limit);
  if(stale.length)await db.saves.bulkDelete(stale);
  return stale.length;
}

export async function loadSave(id: string) {
  const record = await db.saves.get(scopedId(id));
  if(!record||!owned(record))return null;
  const state=migrateSave(record.state);if(!state)warnIncompatible(record);
  return state;
}

export async function loadMostRecentSave() {
  const owner=demoOwner(),records = await db.saves.orderBy('updatedAt').reverse().toArray();
  return selectMostRecentCompatibleSave(records.filter(record=>owned(record,owner)));
}

export async function listSaves() {
  const owner=demoOwner();return (await db.saves.orderBy('updatedAt').reverse().toArray()).filter(record=>owned(record,owner));
}

export function selectMostRecentCompatibleSave(records:(Pick<SaveRecord,'state'>&Partial<Pick<SaveRecord,'id'>>)[]) {
 for(const record of records){const state=migrateSave(record.state);if(state)return state;warnIncompatible(record);}
 return null;
}
function warnIncompatible(record:Pick<SaveRecord,'state'>&Partial<Pick<SaveRecord,'id'>>) {
 console.warn(`Skipping incompatible save ${record.id??'(unnamed)'}: schema ${record.state?.schemaVersion??'missing'} failed migration or validation`);
}
