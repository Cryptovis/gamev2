import {demoOwner} from '../session/demoAccounts';
import type { GameState } from '../domain/game';
import { db, type SaveRecord } from './database';

import { snapshotGame } from './snapshot';
import { migrateSave } from './migrations';
const scopedId=(id:string,owner=demoOwner())=>owner==='guest'||id.startsWith(owner+':')?id:owner+':'+id;
const owned=(record:SaveRecord,owner=demoOwner())=> (record.owner??'guest')===owner;
export async function saveGame(state: GameState, id = 'manual', name = 'Manual Save',owner=demoOwner()) {
  const record: SaveRecord = { id:scopedId(id,owner), owner, name, updatedAt: Date.now(), schemaVersion: state.schemaVersion, state: snapshotGame(state) };
  await db.saves.put(record);
  return record;
}

export async function loadSave(id: string) {
  const record = await db.saves.get(scopedId(id));
  return record&&owned(record)?migrateSave(record.state):null;
}

export async function loadMostRecentSave() {
  const owner=demoOwner(),records = await db.saves.orderBy('updatedAt').reverse().toArray();
  return selectMostRecentCompatibleSave(records.filter(record=>owned(record,owner)));
}

export async function listSaves() {
  const owner=demoOwner();return (await db.saves.orderBy('updatedAt').reverse().toArray()).filter(record=>owned(record,owner));
}

export function selectMostRecentCompatibleSave(records:Pick<SaveRecord,'state'>[]) {
 for(const record of records){const state=migrateSave(record.state);if(state)return state;}
 return null;
}
